"use client";

import { useCallback } from "react";

interface LastLessonData {
  lessonUrl: string;
  lessonId: string;
  timestamp: number;
}

const LAST_LESSON_KEY = "lastLessonVisited";
const EXPIRY_DAYS = 30;

export const useLastLesson = () => {
  const saveLastLesson = useCallback((lessonId: string, lessonUrl: string) => {
    // Guard against SSR/hydration issues
    if (typeof window === "undefined") return;

    try {
      const data: LastLessonData = {
        lessonUrl,
        lessonId,
        timestamp: Date.now(),
      };
      localStorage.setItem(LAST_LESSON_KEY, JSON.stringify(data));

      // Also persist as a cookie so the server can redirect instantly
      try {
        const maxAgeSeconds = EXPIRY_DAYS * 24 * 60 * 60;
        const encodedUrl = encodeURIComponent(
          lessonUrl?.endsWith("/learn")
            ? lessonUrl.replace(/\/learn$/, "/practice")
            : lessonUrl
        );
        document.cookie = `lastLessonVisitedUrl=${encodedUrl}; path=/; max-age=${maxAgeSeconds}`;
      } catch {
        // ignore cookie errors
      }
    } catch (error) {
      console.error("Failed to save last lesson:", error);
    }
  }, []);

  const getLastLesson = useCallback((): LastLessonData | null => {
    // Guard against SSR/hydration issues
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(LAST_LESSON_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Validate the parsed data structure
      if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof parsed.lessonUrl !== "string" ||
        typeof parsed.lessonId !== "string" ||
        typeof parsed.timestamp !== "number" ||
        !parsed.lessonUrl ||
        !parsed.lessonId
      ) {
        localStorage.removeItem(LAST_LESSON_KEY);
        return null;
      }

      const data: LastLessonData = parsed;

      // Check if data is expired (older than 30 days)
      const isExpired =
        Date.now() - data.timestamp > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      if (isExpired) {
        localStorage.removeItem(LAST_LESSON_KEY);
        return null;
      }

      // Handle legacy URLs ending with /learn - redirect to /practice
      if (data.lessonUrl.endsWith("/learn")) {
        data.lessonUrl = data.lessonUrl.replace(/\/learn$/, "/practice");
        // Update localStorage with the corrected URL
        try {
          localStorage.setItem(LAST_LESSON_KEY, JSON.stringify(data));
        } catch (error) {
          console.error("Failed to update last lesson URL:", error);
        }
      }

      return data;
    } catch (error) {
      console.error("Failed to get last lesson:", error);
      try {
        localStorage.removeItem(LAST_LESSON_KEY);
      } catch {
        // Ignore if localStorage is not available
      }
      return null;
    }
  }, []);

  const clearLastLesson = useCallback(() => {
    try {
      localStorage.removeItem(LAST_LESSON_KEY);
    } catch (error) {
      console.error("Failed to clear last lesson:", error);
    }
  }, []);

  const setIntentionalHomeVisit = useCallback(() => {
    // Guard against SSR/hydration issues
    if (typeof window === "undefined") return;

    try {
      sessionStorage.setItem("intentionalHomeVisit", "true");
      // Also set a short-lived cookie so the server-rendered home page
      // can avoid auto-redirecting immediately after a deliberate click.
      try {
        document.cookie = `intentionalHomeVisit=true; path=/; max-age=10`;
      } catch {
        // ignore cookie errors
      }
    } catch (error) {
      console.error("Failed to set intentional home visit:", error);
    }
  }, []);

  const isIntentionalHomeVisit = useCallback(() => {
    // Guard against SSR/hydration issues
    if (typeof window === "undefined") return false;

    try {
      const isIntentional =
        sessionStorage.getItem("intentionalHomeVisit") === "true";
      // Don't remove the flag here - let it be consumed only when actually used
      return isIntentional;
    } catch (error) {
      console.error("Failed to check intentional home visit:", error);
      return false;
    }
  }, []);

  const consumeIntentionalHomeVisit = useCallback(() => {
    // Guard against SSR/hydration issues
    if (typeof window === "undefined") return false;

    try {
      const isIntentional =
        sessionStorage.getItem("intentionalHomeVisit") === "true";
      if (isIntentional) {
        sessionStorage.removeItem("intentionalHomeVisit");
      }
      return isIntentional;
    } catch (error) {
      console.error("Failed to consume intentional home visit:", error);
      return false;
    }
  }, []);

  return {
    saveLastLesson,
    getLastLesson,
    clearLastLesson,
    setIntentionalHomeVisit,
    isIntentionalHomeVisit,
    consumeIntentionalHomeVisit,
  };
};
