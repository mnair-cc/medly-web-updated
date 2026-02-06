import "server-only";

import moment from "moment-timezone";
import {
  ANY_SUBJECT_DAY_SCENARIO,
  MOCK_DATES,
  MOCK_DATE_FLAG_KEY,
  MOCK_SCENARIO_DATES,
  MOCK_SUBJECT_DATES,
} from "./constants";

// =============================================================================
// SERVER-SIDE ASYNC FUNCTIONS
// =============================================================================
// These functions are for server components only. They handle PostHog feature
// flag lookups internally via auth session.

/**
 * Get the current scenario from PostHog (server-side).
 * Internally handles auth and PostHog lookup.
 */
const getServerScenario = async (): Promise<string | null> => {
  try {
    const { auth } = await import("@/auth");
    const { getServerFeatureFlag } = await import("@/app/_lib/posthog/actions");

    const session = await auth();
    if (!session?.user?.id) return null;

    const scenario = await getServerFeatureFlag(
      session.user.id,
      MOCK_DATE_FLAG_KEY,
    );
    if (!scenario || scenario === "none") return null;

    return scenario;
  } catch {
    return null;
  }
};

/**
 * Get scenario offset for server-side use.
 * Internally handles auth and PostHog lookup.
 */
const getServerScenarioOffset = async (): Promise<number> => {
  try {
    const scenario = await getServerScenario();
    if (!scenario || !MOCK_SCENARIO_DATES[scenario]) {
      return 0;
    }

    const realNow = moment().utc();
    const scenarioNow = moment
      .tz(MOCK_SCENARIO_DATES[scenario], "Europe/London")
      .utc();

    return realNow.diff(scenarioNow);
  } catch {
    return 0;
  }
};

/**
 * Check if the "any_subject_day" scenario is active (server-side async).
 * When active, subject-specific date checks should be skipped.
 */
export const isAnySubjectDayActiveAsync = async (): Promise<boolean> => {
  const scenario = await getServerScenario();
  return scenario === ANY_SUBJECT_DAY_SCENARIO;
};

/**
 * Async version of getMockDateInUTC for server components.
 * Handles PostHog feature flag lookup internally.
 *
 * Use this in server components. For client components, use the `useMockDates` hook
 * or `getMockDateInUTC` from utils.ts.
 */
export const getMockDateInUTCAsync = async (
  name: "registration_opens" | "mocks_start" | "mocks_end" | "results_day",
): Promise<moment.Moment> => {
  const dateObj = MOCK_DATES[name];
  const baseDate = moment.tz(dateObj, "Europe/London").utc();

  const offset = await getServerScenarioOffset();
  if (offset !== 0) {
    return baseDate.clone().add(offset, "milliseconds");
  }
  return baseDate;
};

/**
 * Async version of getMockSubjectDate that works in server components.
 * Handles PostHog feature flag lookup internally.
 *
 * When "any_subject_day" scenario is active, returns a date 1 hour in the past
 * so that subject date checks naturally pass (we're within the 24-hour window).
 *
 * Returns a moment in Europe/London timezone for consistent date comparisons.
 *
 * Use this in server components (async). For client components, use getMockSubjectDate.
 */
export const getMockSubjectDateAsync = async (
  subject: string,
): Promise<moment.Moment> => {
  // Check if any_subject_day is active - if so, return a date that will pass checks
  const isAnySubject = await isAnySubjectDayActiveAsync();
  if (isAnySubject) {
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

  const offset = await getServerScenarioOffset();
  if (offset !== 0) {
    baseDate = baseDate.clone().add(offset, "milliseconds");
  }
  return baseDate;
};
