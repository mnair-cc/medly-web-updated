import { useCallback } from "react";
import { lessonSlug } from "../utils/lessonSlug";
import {
  LLQ_COOKIE_NAME,
  LLQ_MAX_ENTRIES,
  upsertLlq,
  removeFromLlq,
} from "../utils/llq";

interface LastLessonQuestionData {
  lessonId: string;
  lastQuestionPageIndex: number;
  timestamp: number;
}

const LAST_LESSON_QUESTION_KEY = "lastLessonQuestion";
const EXPIRY_DAYS = 30;

export const useLastLessonQuestion = () => {
  const saveLastQuestionViewed = useCallback(
    (lessonId: string, pageIndex: number) => {
      // Guard against SSR/hydration issues
      if (typeof window === "undefined") return;

      try {
        const data: LastLessonQuestionData = {
          lessonId,
          lastQuestionPageIndex: pageIndex,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          `${LAST_LESSON_QUESTION_KEY}_${lessonId}`,
          JSON.stringify(data)
        );
        // Update compact LRU cookie for SSR
        try {
          const slug = lessonSlug(lessonId);
          const cookieMap: Record<string, string> = document.cookie
            .split("; ")
            .filter(Boolean)
            .reduce(
              (acc, cur) => {
                const eqIdx = cur.indexOf("=");
                if (eqIdx > -1) {
                  const k = cur.slice(0, eqIdx);
                  const v = cur.slice(eqIdx + 1);
                  acc[k] = v;
                }
                return acc;
              },
              {} as Record<string, string>
            );

          const currentLlq = cookieMap[LLQ_COOKIE_NAME];
          const newLlq = upsertLlq(
            currentLlq,
            { slug, index: pageIndex },
            LLQ_MAX_ENTRIES
          );
          const expiryDate = new Date(
            Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000
          );
          document.cookie = `${LLQ_COOKIE_NAME}=${newLlq}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;

          // Remove legacy per-lesson cookie to avoid bloat
          document.cookie = `${LAST_LESSON_QUESTION_KEY}_${lessonId}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
        } catch {
          // Ignore cookie write errors
        }
      } catch (error) {
        console.error("Failed to save last question viewed:", error);
      }
    },
    []
  );

  const getLastQuestionViewed = useCallback(
    (lessonId: string): number | null => {
      // Guard against SSR/hydration issues
      if (typeof window === "undefined") return null;

      try {
        const stored = localStorage.getItem(
          `${LAST_LESSON_QUESTION_KEY}_${lessonId}`
        );
        if (!stored) return null;

        const parsed = JSON.parse(stored);

        // Validate the parsed data structure
        if (
          !parsed ||
          typeof parsed !== "object" ||
          typeof parsed.lessonId !== "string" ||
          typeof parsed.lastQuestionPageIndex !== "number" ||
          typeof parsed.timestamp !== "number" ||
          parsed.lessonId !== lessonId
        ) {
          localStorage.removeItem(`${LAST_LESSON_QUESTION_KEY}_${lessonId}`);
          return null;
        }

        const data: LastLessonQuestionData = parsed;

        // Check if data is expired (older than 30 days)
        const isExpired =
          Date.now() - data.timestamp > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (isExpired) {
          localStorage.removeItem(`${LAST_LESSON_QUESTION_KEY}_${lessonId}`);
          return null;
        }

        return data.lastQuestionPageIndex;
      } catch (error) {
        console.error("Failed to get last question viewed:", error);
        try {
          localStorage.removeItem(`${LAST_LESSON_QUESTION_KEY}_${lessonId}`);
        } catch {
          // Ignore if localStorage is not available
        }
        return null;
      }
    },
    []
  );

  const clearLastQuestionViewed = useCallback((lessonId: string) => {
    // Guard against SSR/hydration issues
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(`${LAST_LESSON_QUESTION_KEY}_${lessonId}`);
      // Remove from LRU cookie
      const slug = lessonSlug(lessonId);
      const cookieMap: Record<string, string> = document.cookie
        .split("; ")
        .filter(Boolean)
        .reduce(
          (acc, cur) => {
            const eqIdx = cur.indexOf("=");
            if (eqIdx > -1) {
              const k = cur.slice(0, eqIdx);
              const v = cur.slice(eqIdx + 1);
              acc[k] = v;
            }
            return acc;
          },
          {} as Record<string, string>
        );

      const currentLlq = cookieMap[LLQ_COOKIE_NAME];
      const newLlq = removeFromLlq(currentLlq, slug, LLQ_MAX_ENTRIES);
      const expiryDate = new Date(
        Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000
      );
      document.cookie = `${LLQ_COOKIE_NAME}=${newLlq}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;

      // Also clear legacy per-lesson cookie if present
      document.cookie = `${LAST_LESSON_QUESTION_KEY}_${lessonId}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    } catch (error) {
      console.error("Failed to clear last question viewed:", error);
    }
  }, []);

  return {
    saveLastQuestionViewed,
    getLastQuestionViewed,
    clearLastQuestionViewed,
  };
};
