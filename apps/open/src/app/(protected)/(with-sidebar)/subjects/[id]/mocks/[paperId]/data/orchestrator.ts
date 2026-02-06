import { auth } from "@/auth";
import { SessionData } from "@/app/(protected)/sessions/types";
import { fetchMockData } from "./fetchers/curriculum";
import { assembleSessionData } from "./processors/assemble";
import { curriculumApiFetch } from "@/app/_lib/server/curriculum-api";

interface SessionResponse {
  data: {
    sessionData?: {
      timeStarted?: string;
      timeFinished?: string;
      resultsDayInsights?: Record<string, unknown>;
      initialInsights?: Record<string, unknown>;
    };
    answers?: unknown[];
  };
}

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

  // 2) Fetch mock data and session data in parallel
  const [mockData, sessionResponse] = await Promise.all([
    fetchMockData(subjectId, paperId),
    curriculumApiFetch<SessionResponse>(
      `/api/v2/papers/${paperId}/session`,
      {
        token: session.databaseApiAccessToken!,
      }
    ).catch(() => null), // graceful fallback if no session exists yet
  ]);

  // Extract sessionData from response structure: { data: { sessionData: {...}, answers: [...] } }
  const existingSessionData = sessionResponse?.data?.sessionData || null;

  const { questions, mockData: mockDetails } = mockData;

  if (!questions || questions.length === 0) {
    throw new Error("No questions available for this mock");
  }

  // 3) Assemble session data - questions already include user answers from curriculum API
  // gcseHigher is derived from the paper/exam itself, not the user's subject preference
  return assembleSessionData(paperId, questions, mockDetails, {
    ...existingSessionData,
    gcseHigher: mockDetails.gcseHigher ?? undefined,
  });
}
