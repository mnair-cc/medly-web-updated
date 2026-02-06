import {
  curriculumApiFetch,
  CurriculumApiError,
} from "@/app/_lib/server/curriculum-api";
import { ForbiddenError } from "@/app/(protected)/sessions/utils/errors";
import {
  QuestionsResponse,
  LessonResponse,
  LessonProgressResponse,
  LearnFlowProgressResponse,
} from "../response-types";

/**
 * Fetch lesson details from curriculum API
 */
export async function fetchLessonDetails(
  lessonId: string,
  accessToken: string
): Promise<LessonResponse> {
  try {
    const response = await curriculumApiFetch<LessonResponse>(
      `/api/v2/lessons/${lessonId}`,
      {
        token: accessToken,
      }
    );

    return response;
  } catch (error) {
    if (error instanceof CurriculumApiError) {
      if (error.statusCode === 404) {
        throw new Error("Lesson not found");
      }
      if (error.statusCode === 403) {
        const errorDetail =
          (error.response as { detail?: string })?.detail || "Access denied";
        console.error("Access denied when fetching lesson details:", {
          lessonId,
          status: error.statusCode,
          detail: errorDetail,
        });
        throw new ForbiddenError(
          `Access denied: You don't have access to this lesson. ${errorDetail}`,
          errorDetail
        );
      }
    }
    console.error("Error fetching lesson details from API:", error);
    throw new Error("Failed to fetch lesson details");
  }
}

/**
 * Fetch questions with user's answers from curriculum API
 */
export async function fetchQuestionsWithAnswers(
  lessonId: string,
  accessToken: string
): Promise<QuestionsResponse> {
  try {
    const response = await curriculumApiFetch<QuestionsResponse>(
      `/api/v2/lessons/${lessonId}/questions`,
      {
        token: accessToken,
      }
    );

    return response;
  } catch (error) {
    if (error instanceof CurriculumApiError) {
      if (error.statusCode === 404) {
        throw new Error("No practice questions available for this lesson");
      }
      if (error.statusCode === 403) {
        const errorDetail =
          (error.response as { detail?: string })?.detail || "Access denied";
        console.error("Access denied when fetching questions:", {
          lessonId,
          status: error.statusCode,
          detail: errorDetail,
        });
        throw new ForbiddenError(
          `Access denied: You don't have access to this lesson. ${errorDetail}`,
          errorDetail
        );
      }
    }
    console.error("Error fetching questions from API:", error);
    throw new Error("Failed to fetch practice questions");
  }
}

/**
 * Fetch lesson progress/knowledge model from curriculum API
 */
export async function fetchLessonProgress(
  lessonId: string,
  accessToken: string
): Promise<LessonProgressResponse> {
  try {
    const response = await curriculumApiFetch<LessonProgressResponse>(
      `/api/v2/lessons/${lessonId}/progress`,
      {
        token: accessToken,
      }
    );

    return response;
  } catch (error) {
    if (error instanceof CurriculumApiError) {
      if (error.statusCode === 404) {
        // Return defaults if no progress exists yet
        return {
          data: {
            mu: 0,
            sigma: 1,
            p_mastery: 0,
            mastery_tier: 1,
            rank: 0,
          },
        };
      }
      if (error.statusCode === 403) {
        const errorDetail =
          (error.response as { detail?: string })?.detail || "Access denied";
        console.error("Access denied when fetching lesson progress:", {
          lessonId,
          status: error.statusCode,
          detail: errorDetail,
        });
        // Return defaults on access denied (user might not have registered subject yet)
        return {
          data: {
            mu: 0,
            sigma: 1,
            p_mastery: 0,
            mastery_tier: 1,
            rank: 0,
          },
        };
      }
    }
    console.error("Error fetching lesson progress from API:", error);
    // Return defaults on error
    return {
      data: {
        mu: 0,
        sigma: 1,
        p_mastery: 0,
        mastery_tier: 1,
        rank: 0,
      },
    };
  }
}

/**
 * Fetch learn flow progress from curriculum API
 */
export async function fetchLearnFlowProgress(
  lessonId: string,
  accessToken: string
): Promise<LearnFlowProgressResponse | null> {
  try {
    const response = await curriculumApiFetch<LearnFlowProgressResponse>(
      `/api/v2/lessons/${lessonId}/learn-flow`,
      {
        token: accessToken,
      }
    );

    return response;
  } catch (error) {
    if (error instanceof CurriculumApiError) {
      if (error.statusCode === 404) {
        // Return null if no progress exists yet (first time user)
        return null;
      }
      if (error.statusCode === 403) {
        const errorDetail =
          (error.response as { detail?: string })?.detail || "Access denied";
        console.error("Access denied when fetching learn flow progress:", {
          lessonId,
          status: error.statusCode,
          detail: errorDetail,
        });
        // Return null on access denied
        return null;
      }
    }
    console.error("Error fetching learn flow progress from API:", error);
    // Return null on error (graceful fallback)
    return null;
  }
}
