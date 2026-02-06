import { auth } from "@/auth";
import { SessionData } from "@/app/(protected)/sessions/types";
import { fetchPaperData } from "./fetchers/curriculum";
import { assembleSessionData } from "./processors/assemble";
import { fetchAndSerialiseSessionData } from "./fetchers/session";

// Central orchestrator: authenticate, fetch sources in parallel, assemble final DTO
export async function fetchSessionData(
  subjectId: string,
  paperId: string
): Promise<SessionData> {
  // 1) Auth
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User authentication required");
  }

  // 2) Fetch in parallel - curriculum API returns questions WITH user answers included
  const [paperData, existingSessionData] = await Promise.all([
    fetchPaperData(subjectId, paperId),
    fetchAndSerialiseSessionData(subjectId, paperId).catch(() => null), // graceful fallback
  ]);

  const { questions, paperData: paperDetails } = paperData;

  if (!questions || questions.length === 0) {
    throw new Error("No questions available for this paper");
  }

  // 3) Assemble session data - questions already include user answers from curriculum API
  // gcseHigher is derived from the paper/exam itself, not the user's subject preference
  return assembleSessionData(paperId, questions, paperDetails, {
    ...existingSessionData,
    gcseHigher: paperDetails.gcseHigher ?? undefined,
  });
}
