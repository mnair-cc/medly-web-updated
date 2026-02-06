"use client";

import { isSubjectUnlockedByFeature } from "@/app/_lib/medlyMondays/utils";
import { useMedlyMondaysFeature } from "@/app/_context/MedlyMondaysProvider";

/**
 * Hook to get the current Medly Mondays state.
 *
 * The feature value is fetched server-side and provided via context.
 * This hook reads from context and computes derived values.
 *
 * @returns {boolean} isTextbookUnlocked - Whether textbook viewing is unlocked
 * @returns {function} isSubjectUnlocked - Check if a specific subject is unlocked (by legacy ID)
 */
export function useMedlyMondays() {
  const feature = useMedlyMondaysFeature();

  return {
    /** Whether textbook viewing (without chat) is unlocked */
    isTextbookUnlocked: feature === "textbook-view",
    /**
     * Check if a specific subject is unlocked by the current Medly Mondays feature.
     * @param subjectLegacyId - The subject legacy ID (e.g., "aqaGCSEBio", "edexcelA2Chem")
     */
    isSubjectUnlocked: (subjectLegacyId: string | undefined | null) =>
      isSubjectUnlockedByFeature(subjectLegacyId, feature),
  };
}
