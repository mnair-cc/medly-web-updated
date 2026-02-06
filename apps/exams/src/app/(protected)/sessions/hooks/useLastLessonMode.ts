import { useCallback } from "react";

type LessonMode = "learn" | "learn-page" | "practice";

const LAST_LESSON_MODE_KEY = "lastLessonMode";
const EXPIRY_DAYS = 30;

export const useLastLessonMode = () => {
  const saveLastMode = useCallback((mode: LessonMode) => {
    if (typeof window === "undefined") return;

    try {
      const data = {
        mode,
        timestamp: Date.now(),
      };
      localStorage.setItem(LAST_LESSON_MODE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save last lesson mode:", error);
    }
  }, []);

  const getLastMode = useCallback((): LessonMode | null => {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(LAST_LESSON_MODE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof parsed.mode !== "string" ||
        typeof parsed.timestamp !== "number"
      ) {
        localStorage.removeItem(LAST_LESSON_MODE_KEY);
        return null;
      }

      // Check if data is expired (older than 30 days)
      const isExpired =
        Date.now() - parsed.timestamp > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      if (isExpired) {
        localStorage.removeItem(LAST_LESSON_MODE_KEY);
        return null;
      }

      // Validate mode is one of the allowed values
      if (parsed.mode === "learn" || parsed.mode === "learn-page" || parsed.mode === "practice") {
        return parsed.mode;
      }

      localStorage.removeItem(LAST_LESSON_MODE_KEY);
      return null;
    } catch (error) {
      console.error("Failed to get last lesson mode:", error);
      try {
        localStorage.removeItem(LAST_LESSON_MODE_KEY);
      } catch {
        // Ignore
      }
      return null;
    }
  }, []);

  return {
    saveLastMode,
    getLastMode,
  };
};

