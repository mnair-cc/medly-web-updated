// =============================================================================
// MEDLY MONDAYS FEATURE
// =============================================================================
//
// Medly Mondays is a promotional feature that unlocks premium features for all
// users on Mondays. The specific feature unlocked is controlled via PostHog.
//
// POSTHOG FLAGS:
// 1. "medly-mondays-feature" (multivariate with payloads):
//    Variant keys (must be exact):
//    - "none" (default) - Medly Mondays disabled
//    - "textbook-view" - Unlock textbook viewing (not chat)
//    - "subject" - Unlock subjects specified in payload
//
//    Payload (required for "subject" variant):
//    {"subjects": ["aqaGCSEBio", "aqaA2Bio", "edexcelGCSEBio", ...]}
//
// 2. "medly-mondays-day-override" (boolean):
//    - false (default) - Use real day
//    - true - Bypass Monday check for testing
//
// USAGE:
// - Client components: use the useMedlyMondays() hook
// - Server components: use getMedlyMondaysFeatureAsync()
//
// ARCHITECTURE:
// - Feature is fetched server-side in (with-sidebar)/layout.tsx
// - Provided to client via MedlyMondaysProvider context
// - useMedlyMondays() hook reads from context
//
// SUBJECT MATCHING:
// - Uses exact match on subject legacy ID (case-sensitive)
// - Legacy IDs must match exactly: "aqaGCSEBio", "edexcelA2Chem", etc.
// - No fuzzy matching or parsing - explicit is safer
//

import moment from "moment";

// Feature flag keys
export const MEDLY_MONDAYS_FEATURE_FLAG_KEY = "medly-mondays-feature";
export const MEDLY_MONDAYS_DAY_OVERRIDE_FLAG_KEY = "medly-mondays-day-override";

// JSON payload type for subject unlock
export interface MedlyMondaysSubjectPayload {
  subjects: string[];
}

// Valid feature values - can be string or JSON payload
export type MedlyMondaysFeature =
  | "none"
  | "textbook-view"
  | MedlyMondaysSubjectPayload;

// =============================================================================
// SUBJECT UNLOCK HELPERS
// =============================================================================

/**
 * Check if a subject is unlocked by the current Medly Mondays feature.
 *
 * @param subjectLegacyId - The subject legacy ID (e.g., "aqaGCSEBio", "edexcelA2Chem")
 * @param feature - The current Medly Mondays feature
 * @returns true if the subject is unlocked
 *
 * Uses exact matching on subject legacy IDs. Examples:
 * - aqaGCSEBio, aqaA2Bio, aqaGCSECBio (combined)
 * - edexcelGCSEChem, edexcelA2Chem
 * - ocrGCSEPhysA, ocrA2PhysA
 */
export function isSubjectUnlockedByFeature(
  subjectLegacyId: string | undefined | null,
  feature: MedlyMondaysFeature
): boolean {
  // No subject legacy ID or feature is disabled/textbook-only
  if (!subjectLegacyId || feature === "none" || feature === "textbook-view") {
    return false;
  }

  // Check if feature is a subject payload with subjects array
  if (typeof feature === "object" && "subjects" in feature && Array.isArray(feature.subjects)) {
    // Exact match on subject legacy ID (case-sensitive)
    return feature.subjects.includes(subjectLegacyId);
  }

  return false;
}

/**
 * Check if it's currently within the Medly Mondays window.
 * Window: 9am Monday UTC to 9am Tuesday UTC (24 hours).
 */
export function isCurrentlyMondayUTC(): boolean {
  const now = moment.utc();
  const day = now.day(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
  const hour = now.hour();

  // Monday (day 1) from 9am onwards
  if (day === 1 && hour >= 9) {
    return true;
  }

  // Tuesday (day 2) before 9am
  if (day === 2 && hour < 9) {
    return true;
  }

  return false;
}

// =============================================================================
// SERVER-SIDE ASYNC FUNCTIONS
// =============================================================================

/**
 * Get the day override flag from PostHog (server-side).
 * Returns true if the Monday check should be bypassed for testing.
 */
async function getDayOverrideAsync(): Promise<boolean> {
  try {
    const { auth } = await import("@/auth");
    const { getServerFeatureFlag } = await import("@/app/_lib/posthog/actions");

    const session = await auth();
    if (!session?.user?.id) return false;

    const override = await getServerFeatureFlag(
      session.user.id,
      MEDLY_MONDAYS_DAY_OVERRIDE_FLAG_KEY
    );
    return override === "true";
  } catch {
    return false;
  }
}

/**
 * Parse the feature flag payload from PostHog.
 * Expects a payload object with a "subjects" array.
 */
function parsePayload(payload: unknown): MedlyMondaysSubjectPayload | null {
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;
  if ("subjects" in obj && Array.isArray(obj.subjects)) {
    // Ensure all subjects are strings
    const subjects = obj.subjects.filter(
      (s): s is string => typeof s === "string"
    );
    if (subjects.length > 0) {
      return { subjects };
    }
  }

  return null;
}

/**
 * Get the feature flag from PostHog (server-side).
 * Uses explicit variant keys:
 * - "none" - disabled
 * - "textbook-view" - textbook only
 * - "subject" - unlock subjects specified in payload
 */
async function getFeatureFlagAsync(): Promise<MedlyMondaysFeature> {
  try {
    const { auth } = await import("@/auth");
    const { getServerFeatureFlagWithPayload } = await import(
      "@/app/_lib/posthog/actions"
    );

    const session = await auth();
    if (!session?.user?.id) return "none";

    const { variant, payload } = await getServerFeatureFlagWithPayload(
      session.user.id,
      MEDLY_MONDAYS_FEATURE_FLAG_KEY
    );

    // Explicit variant handling
    switch (variant) {
      case "none":
      case null:
        return "none";

      case "textbook-view":
        return "textbook-view";

      case "subject": {
        // Parse the payload for subjects to unlock
        const subjectPayload = parsePayload(payload);
        if (subjectPayload) {
          return subjectPayload;
        }
        // No valid payload - treat as disabled
        console.warn("Medly Mondays: 'subject' variant has no valid payload");
        return "none";
      }

      default:
        // Unknown variant - log warning and treat as disabled
        console.warn(`Medly Mondays: Unknown variant "${variant}"`);
        return "none";
    }
  } catch {
    return "none";
  }
}

/**
 * Check if it's considered "Monday" for Medly Mondays purposes (server-side).
 * This accounts for the day override flag for testing.
 */
export async function isMedlyMondayAsync(): Promise<boolean> {
  const dayOverride = await getDayOverrideAsync();
  if (dayOverride) return true;
  return isCurrentlyMondayUTC();
}

/**
 * Get the active Medly Mondays feature (server-side).
 * Returns "none" if Medly Mondays is not active (not Monday or no feature set).
 *
 * This is called in (with-sidebar)/layout.tsx and the result is provided
 * to client components via MedlyMondaysProvider context.
 */
export async function getMedlyMondaysFeatureAsync(): Promise<MedlyMondaysFeature> {
  const isMonday = await isMedlyMondayAsync();
  if (!isMonday) return "none";
  return await getFeatureFlagAsync();
}
