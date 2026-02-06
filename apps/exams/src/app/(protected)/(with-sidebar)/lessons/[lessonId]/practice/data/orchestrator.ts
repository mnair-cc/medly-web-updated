import { SessionData } from "@/app/(protected)/sessions/types";
import { getServerFeatureFlag } from "@/app/_lib/posthog/actions";
import { auth } from "@/auth";
import {
  fetchLearnFlowProgress,
  fetchLessonDetails,
  fetchLessonProgress,
  fetchQuestionsWithAnswers,
} from "./fetchers/curriculum";
import { assembleSessionData } from "./processors/assemble";
import {
  transformLearnFlowProgressResponse,
  transformLessonProgressResponse,
  transformLessonResponse,
  transformQuestionsResponse,
} from "./processors/transform";

// Central orchestrator: authenticate, fetch sources in parallel, assemble final DTO
export async function fetchSessionData(lessonId: string): Promise<SessionData> {
  // 1) Auth
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User authentication required");
  }
  const accessToken = session.databaseApiAccessToken;

  if (!accessToken) {
    throw new Error("Authentication token not available");
  }

  // 2) Check feature flag for learn flow BEFORE fetching
  const learnFlowEnabled = await getServerFeatureFlag(
    session.user.id,
    "maths-learn-flow",
  );

  // 3) Fetch all data in parallel from curriculum API
  const [
    questionsResponse,
    lessonResponse,
    progressResponse,
    learnFlowProgressResponse,
  ] = await Promise.all([
    fetchQuestionsWithAnswers(lessonId, accessToken),
    fetchLessonDetails(lessonId, accessToken),
    fetchLessonProgress(lessonId, accessToken),
    learnFlowEnabled
      ? fetchLearnFlowProgress(lessonId, accessToken).catch(() => null)
      : Promise.resolve(null),
  ]);

  // 4) Transform API responses to internal types
  const questionsWithMarkingResults =
    transformQuestionsResponse(questionsResponse);
  let lessonData = transformLessonResponse(lessonResponse);
  const knowledgeModel = transformLessonProgressResponse(progressResponse);
  const learnFlowProgress = transformLearnFlowProgressResponse(
    learnFlowProgressResponse,
  );

  // Null out learnContent if flag is disabled
  if (!learnFlowEnabled) {
    lessonData = { ...lessonData, learnContent: null };
  }

  // Handle empty questions array (API returns 200 with empty array)
  if (
    !questionsWithMarkingResults ||
    questionsWithMarkingResults.length === 0
  ) {
    throw new Error(
      "No practice questions are available for this lesson yet. Please check back later or try a different lesson.",
    );
  }

  // 5) Assemble session data
  return assembleSessionData(
    lessonId,
    questionsWithMarkingResults,
    lessonData,
    undefined, // gcseHigher handled by API automatically
    knowledgeModel,
    learnFlowProgress,
  );
}
