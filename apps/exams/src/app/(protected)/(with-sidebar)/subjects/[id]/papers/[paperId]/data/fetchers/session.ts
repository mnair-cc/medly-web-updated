import { auth } from "@/auth";
import { curriculumApiFetch } from "@/app/_lib/server/curriculum-api";

interface SessionDataResponse {
  data: {
    sessionData?: {
      timeStarted?: string;
      timeFinished?: string;
      totalMarksAwarded?: number;
      totalMarksPossible?: number;
      questionCount?: number;
    };
    answers?: Array<{
      questionLegacyId: string;
      userAnswer?: unknown;
      userMark?: number;
      markMax?: number;
      isMarked?: boolean;
      isCorrect?: boolean;
      isFlagged?: boolean;
    }>;
  };
}

export async function fetchAndSerialiseSessionData(
  subjectId: string,
  paperId: string
): Promise<{
  timeStarted?: string;
  timeFinished?: string;
  totalMarksAwarded?: number;
  totalMarksPossible?: number;
  questionCount?: number;
  answers: SessionDataResponse["data"]["answers"];
} | null> {
  try {
    const session = await auth();
    if (!session?.databaseApiAccessToken) {
      throw new Error("No authentication token available");
    }

    const response = await curriculumApiFetch<SessionDataResponse>(
      `/api/v2/papers/${paperId}/session`,
      {
        token: session.databaseApiAccessToken,
      }
    );

    const { sessionData, answers } = response.data;

    return {
      timeStarted: sessionData?.timeStarted,
      timeFinished: sessionData?.timeFinished,
      totalMarksAwarded: sessionData?.totalMarksAwarded,
      totalMarksPossible: sessionData?.totalMarksPossible,
      questionCount: sessionData?.questionCount,
      answers: answers || [],
    };
  } catch (error) {
    console.error("Error fetching session data:", error);
    return null;
  }
}
