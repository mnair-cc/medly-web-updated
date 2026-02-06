import moment from "moment-timezone";
import {
  ANY_SUBJECT_DAY_SCENARIO,
  MOCK_DATES,
  MOCK_DATE_FLAG_KEY,
  MOCK_SCENARIO_DATES,
  MOCK_SUBJECT_DATES,
} from "./constants";

// Re-export constants for backward compatibility
export {
  ANY_SUBJECT_DAY_SCENARIO,
  MOCK_DATES,
  MOCK_DATE_FLAG_KEY,
  MOCK_SCENARIO_DATES,
  MOCK_SUBJECT_DATES,
  WAITLIST_THRESHOLD,
} from "./constants";

// =============================================================================
// CLIENT-SIDE FUNCTIONS
// =============================================================================
// These functions are safe to use in client components. They use window.posthog
// for feature flag lookups.

/**
 * Get the current mock date scenario from PostHog feature flag (client-side).
 * Returns null if no scenario is set or PostHog is unavailable.
 */
const getMockDateScenario = (): string | null => {
  if (typeof window === "undefined") return null;

  const posthog = (
    window as {
      posthog?: {
        getFeatureFlag: (key: string) => string | boolean | undefined;
      };
    }
  ).posthog;
  if (!posthog?.getFeatureFlag) return null;

  const scenario = posthog.getFeatureFlag(MOCK_DATE_FLAG_KEY);
  if (!scenario || scenario === "none" || typeof scenario !== "string")
    return null;

  return scenario;
};

/**
 * Calculate the time offset for a mock scenario (client-side).
 * When a scenario is active, we shift all mock dates by the difference between
 * the real current time and the scenario's simulated time.
 *
 * Example: If testing "results_day" (Jan 6, 2026) on Dec 17, 2025:
 * - offset = realNow - scenarioNow = Dec 17 - Jan 6 = -20 days
 * - getMockDateInUTC("results_day") returns Jan 6 + (-20 days) = ~Dec 17
 * - So moment().isAfter(getMockDateInUTC("results_day")) returns true
 */
const getScenarioOffset = (): number => {
  const scenario = getMockDateScenario();
  if (!scenario || !MOCK_SCENARIO_DATES[scenario]) return 0;

  const realNow = moment().utc();
  const scenarioNow = moment
    .tz(MOCK_SCENARIO_DATES[scenario], "Europe/London")
    .utc();

  // Return offset in milliseconds (realNow - scenarioNow)
  return realNow.diff(scenarioNow);
};

/**
 * Check if a mock date scenario is currently active (client-side).
 * Useful for debugging/showing indicator in UI.
 */
export const getActiveMockScenario = (): string | null => {
  return getMockDateScenario();
};

/**
 * Check if the "any_subject_day" scenario is active (client-side).
 * When active, subject-specific date checks should be skipped.
 */
export const isAnySubjectDayActive = (): boolean => {
  return getMockDateScenario() === ANY_SUBJECT_DAY_SCENARIO;
};

/**
 * Get the subject's mock exam start date, adjusted for any active test scenario (client-side).
 *
 * When a PostHog mock_date_scenario is active, the returned date is offset
 * so that moment().isAfter/isBefore comparisons behave as if the current
 * date matches the scenario.
 *
 * When "any_subject_day" scenario is active, returns a date 1 hour in the past
 * so that subject date checks naturally pass (we're within the 24-hour window).
 *
 * Returns a moment in Europe/London timezone for consistent date comparisons.
 */
export const getMockSubjectDate = (subject: string): moment.Moment => {
  // Check if any_subject_day is active - if so, return a date that will pass checks
  if (isAnySubjectDayActive()) {
    // Return 1 hour ago so we're always within the 24-hour window
    return moment.tz("Europe/London").subtract(1, "hour");
  }

  const s = subject.toLowerCase();
  let baseDate: moment.Moment | null = null;

  for (const [key, date] of Object.entries(MOCK_SUBJECT_DATES)) {
    if (s.includes(key)) {
      baseDate = moment.tz(date, "Europe/London");
      break;
    }
  }

  if (!baseDate) {
    return moment.tz("Europe/London");
  }

  // Apply scenario offset if a test scenario is active
  const offset = getScenarioOffset();
  if (offset !== 0) {
    baseDate = baseDate.add(offset, "milliseconds");
  }

  return baseDate;
};

/**
 * Get a mock milestone date in UTC, adjusted for any active test scenario (client-side).
 *
 * When a PostHog mock_date_scenario is active, the returned date is offset
 * so that moment().isAfter/isBefore comparisons behave as if the current
 * date matches the scenario. This keeps test logic isolated here rather
 * than scattered across call sites.
 *
 * @internal For client components, prefer using the `useMockDates` hook
 * instead of calling this function directly.
 */
export const getMockDateInUTC = (
  name: "registration_opens" | "mocks_start" | "mocks_end" | "results_day",
): moment.Moment => {
  const dateObj = MOCK_DATES[name];
  // Parse the date as London time (for readability) but convert to UTC for consistent comparisons
  const baseDate = moment.tz(dateObj, "Europe/London").utc();

  // Apply scenario offset if a test scenario is active
  const offset = getScenarioOffset();
  if (offset !== 0) {
    return baseDate.add(offset, "milliseconds");
  }

  return baseDate;
};
