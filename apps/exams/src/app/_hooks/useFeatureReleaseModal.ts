"use client";

import { useState, useEffect, useMemo } from "react";
import { useSubject } from "./useSubject";
import {
  featureReleases,
  getFeatureReleaseStorageKey,
  hasSeenFeatureRelease,
  markFeatureReleaseSeen,
  type FeatureReleaseConfig,
  type FeatureReleaseEligibility,
} from "@/app/_config/featureReleases";

interface UserSubject {
  id: number;
  legacyId: string;
  title: string;
  course: string;
  examBoard: string;
  gcseHigher?: boolean;
}

interface UseFeatureReleaseModalProps {
  userSubjects: UserSubject[];
  hasActivePlan?: boolean;
}

interface UseFeatureReleaseModalReturn {
  /** The feature release config to show, or null if none should be shown */
  activeFeature: FeatureReleaseConfig | null;
  /** Whether the modal should be shown */
  showModal: boolean;
  /** Resolved URL for dynamic URL features */
  resolvedUrl: string | null;
  /** Call this to dismiss the modal and mark as seen */
  dismissModal: () => void;
  /** Whether the hook is still loading */
  isLoading: boolean;
}

export function useFeatureReleaseModal({
  userSubjects,
  hasActivePlan = false,
}: UseFeatureReleaseModalProps): UseFeatureReleaseModalReturn {
  const [seenStatus, setSeenStatus] = useState<Record<string, boolean>>({});
  const [isReady, setIsReady] = useState(false);

  // Find eligible feature releases
  const eligibleFeatures = useMemo(() => {
    return featureReleases.filter((feature) => {
      if (!feature.active) return false;
      return checkEligibility(feature.eligibility, userSubjects, hasActivePlan);
    });
  }, [userSubjects, hasActivePlan]);

  // Check localStorage on mount for all features
  useEffect(() => {
    const status: Record<string, boolean> = {};
    for (const feature of featureReleases) {
      status[feature.id] = hasSeenFeatureRelease(feature.id);
    }
    setSeenStatus(status);
    setIsReady(true);
  }, []);

  // Find the first unseen eligible feature
  const activeFeature = useMemo(() => {
    if (!isReady) return null;
    return eligibleFeatures.find((feature) => !seenStatus[feature.id]) ?? null;
  }, [eligibleFeatures, seenStatus, isReady]);

  // For dynamic URL features, we need to fetch additional data
  // Currently only supports "firstUnstartedMathsLesson"
  const mathsSubject = useMemo(() => {
    if (activeFeature?.dynamicUrl !== "firstUnstartedMathsLesson") return null;
    return userSubjects.find((subject) => {
      const isMaths = subject.title.toLowerCase().includes("math");
      const isGcseOrALevel =
        subject.course === "GCSE" || subject.course === "A Level";
      return isMaths && isGcseOrALevel;
    });
  }, [userSubjects, activeFeature]);

  const { data: mathsData, isLoading: isMathsLoading } = useSubject(
    mathsSubject?.legacyId ?? "",
    mathsSubject?.gcseHigher
  );

  // Find first unstarted lesson for dynamic URL
  const resolvedUrl = useMemo(() => {
    if (activeFeature?.dynamicUrl !== "firstUnstartedMathsLesson") return null;
    if (!mathsData?.units) return "/"; // Fallback

    for (const unit of mathsData.units) {
      for (const topic of unit.topics) {
        for (const lesson of topic.lessons) {
          if (lesson.answeredQuestions === 0) {
            return `/lessons/${lesson.legacyId}/practice`;
          }
        }
      }
    }

    // If all lessons started, return first lesson
    const firstUnit = mathsData.units[0];
    const firstTopic = firstUnit?.topics[0];
    const firstLesson = firstTopic?.lessons[0];
    return firstLesson ? `/lessons/${firstLesson.legacyId}/practice` : "/";
  }, [mathsData, activeFeature]);

  // Dismiss handler
  const dismissModal = () => {
    if (activeFeature) {
      markFeatureReleaseSeen(activeFeature.id);
      setSeenStatus((prev) => ({
        ...prev,
        [activeFeature.id]: true,
      }));
    }
  };

  const isLoading =
    !isReady ||
    (activeFeature?.dynamicUrl === "firstUnstartedMathsLesson" && isMathsLoading);

  return {
    activeFeature,
    showModal: !isLoading && activeFeature !== null,
    resolvedUrl,
    dismissModal,
    isLoading,
  };
}

// ============================================
// ELIGIBILITY CHECKER
// ============================================

function checkEligibility(
  eligibility: FeatureReleaseEligibility,
  userSubjects: UserSubject[],
  hasActivePlan: boolean
): boolean {
  // If "all" is true, everyone is eligible
  if (eligibility.all) return true;

  // Check subscription
  if (eligibility.subscription) {
    if (eligibility.subscription === "paid" && !hasActivePlan) return false;
    if (eligibility.subscription === "free" && hasActivePlan) return false;
  }

  // Check subjects and courses
  const hasMatchingSubject = userSubjects.some((subject) => {
    // Check subject match
    const subjectMatch =
      !eligibility.subjects ||
      eligibility.subjects.some((s) =>
        subject.title.toLowerCase().includes(s.toLowerCase())
      );

    // Check course match
    const courseMatch =
      !eligibility.courses || eligibility.courses.includes(subject.course as "GCSE" | "A Level");

    return subjectMatch && courseMatch;
  });

  // If subjects or courses are specified, user must match
  if (eligibility.subjects || eligibility.courses) {
    return hasMatchingSubject;
  }

  return true;
}
