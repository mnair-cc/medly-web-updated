/**
 * Email Verification Config
 *
 * Configuration and decision logic for determining if email verification is required.
 * Includes PostHog remote config integration and university email domain validation.
 */

import uniEmailDomainsData from "@/app/_lib/data/uni-email-domains.json";

// ============================================================================
// Constants
// ============================================================================

const SIGNUP_VERIFICATION_FLAG_KEY = "signup-email-verification";

// ============================================================================
// Verification setting validation
// ============================================================================

const VALID_SETTINGS = ["always", "never", "uni_only"] as const;
type VerificationSetting = (typeof VALID_SETTINGS)[number];

function isValidSetting(value: unknown): value is VerificationSetting {
  return (
    typeof value === "string" &&
    VALID_SETTINGS.includes(value as VerificationSetting)
  );
}

// ============================================================================
// Email utilities (internal)
// ============================================================================

/**
 * Normalizes email for consistent comparison (internal use).
 */
function normalizeEmailInternal(email: string): string {
  return email.trim().toLowerCase();
}

// ============================================================================
// University email domain validation
// ============================================================================

// Cached uni email domains set (loaded once on first use)
let uniEmailDomainsSet: Set<string> | null = null;

function getUniEmailDomainsSet(): Set<string> {
  if (!uniEmailDomainsSet) {
    uniEmailDomainsSet = new Set(uniEmailDomainsData.domains);
  }
  return uniEmailDomainsSet;
}

/**
 * Checks if an email belongs to a university domain.
 */
function isUniEmail(email: string): boolean {
  const normalizedEmail = normalizeEmailInternal(email);
  const domain = normalizedEmail.split("@")[1];
  if (!domain) return false;

  const uniDomains = getUniEmailDomainsSet();

  // Check exact domain match
  if (uniDomains.has(domain)) {
    return true;
  }

  // Check if email ends with any uni domain suffix (e.g., student.ox.ac.uk matches ac.uk)
  for (const uniDomain of uniDomains) {
    if (domain.endsWith(`.${uniDomain}`) || domain === uniDomain) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// PostHog integration
// ============================================================================

/**
 * Gets the PostHog remote config value for signup verification.
 * Returns "always" | "never" | "uni_only" or null if not set/error.
 */
async function getPostHogVerificationValue(): Promise<VerificationSetting | null> {
  try {
    // Dynamic import to avoid Edge runtime issues
    const { default: posthogClient } =
      await import("@/app/_lib/posthog/server");

    if (!posthogClient) {
      return null;
    }

    const payload = await posthogClient.getRemoteConfigPayload(
      SIGNUP_VERIFICATION_FLAG_KEY
    );

    if (isValidSetting(payload)) {
      return payload;
    }

    return null;
  } catch (error) {
    console.error("Error fetching PostHog verification config:", error);
    return null;
  }
}

/**
 * Applies a verification setting value to determine if email requires verification.
 */
function applyVerificationSetting(
  setting: VerificationSetting,
  email: string
): boolean {
  switch (setting) {
    case "always":
      return true;
    case "never":
      return false;
    case "uni_only":
      return isUniEmail(email);
  }
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Determines if an email requires verification before signup.
 * Single source of truth - used by the /start endpoint.
 *
 * Decision flow:
 * 1. ENV: SIGNUP_EMAIL_VERIFICATION (source of truth, defaults to "posthog_conditional")
 *    - "always" → return true
 *    - "never" → return false
 *    - "uni_only" → check uni domain
 *    - "posthog_conditional" → fetch from PostHog
 *    - invalid value → log warning, fetch from PostHog
 *
 * 2. If "posthog_conditional" or invalid ENV, fetch PostHog flag "signup-email-verification"
 *    - "always" → return true
 *    - "never" → return false
 *    - "uni_only" → check uni domain
 *    - null/error/invalid → return false (safe default)
 *
 * Safe default: If both ENV and PostHog are misconfigured, returns false (no verification).
 */
export async function requiresEmailVerification(
  email: string
): Promise<boolean> {
  // Step 1: Check ENV VAR (source of truth)
  const envSetting =
    process.env.SIGNUP_EMAIL_VERIFICATION || "posthog_conditional";

  // If ENV provides a valid direct setting, use it
  if (isValidSetting(envSetting)) {
    return applyVerificationSetting(envSetting, email);
  }

  // If ENV is not "posthog_conditional" and not a valid setting, log warning
  if (envSetting !== "posthog_conditional") {
    console.warn(
      `Invalid SIGNUP_EMAIL_VERIFICATION value: "${envSetting}". ` +
        `Expected: "always" | "never" | "uni_only" | "posthog_conditional". ` +
        `Falling back to PostHog.`
    );
  }

  // Step 2: ENV is "posthog_conditional" or invalid, fetch from PostHog
  const posthogValue = await getPostHogVerificationValue();

  // If PostHog returns null/error, default to no verification
  if (!posthogValue) {
    return false;
  }

  // Step 3: Apply PostHog setting
  return applyVerificationSetting(posthogValue, email);
}
