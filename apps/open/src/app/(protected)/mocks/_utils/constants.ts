// =============================================================================
// MOCK EXAM DATE CONSTANTS
// =============================================================================

export const WAITLIST_THRESHOLD = 19000;

export const MOCK_DATES: Record<string, string> = {
  // declare these times as normal. Moment Timezone will handle the conversion to GMT
  registration_opens: "2025-11-03T18:00:00", // Monday, 3 November
  mocks_start: "2025-12-27T09:00:00", // Saturday, 27 December
  mocks_end: "2026-01-02T08:59:59", // Friday, 2 January (aligns with English Literature 24h window)
  results_day: "2026-01-06T18:00:00", // Tuesday, 6 January
};

// Christmas mock dates by subject (times in London timezone)
export const MOCK_SUBJECT_DATES: Record<string, string> = {
  biology: "2025-12-27T09:00:00", // Saturday, 27 December
  chemistry: "2025-12-28T09:00:00", // Sunday, 28 December
  physics: "2025-12-29T09:00:00", // Monday, 29 December
  "english language": "2025-12-30T09:00:00", // Tuesday, 30 December
  maths: "2025-12-31T09:00:00", // Wednesday, 31 December
  mathematics: "2025-12-31T09:00:00", // Wednesday, 31 December
  "english literature": "2026-01-01T09:00:00", // Thursday, 1 January
};

// =============================================================================
// MOCK DATE TESTING (PostHog Feature Flag)
// =============================================================================
//
// This enables testers to simulate different mock exam periods without changing code.
//
// SETUP IN POSTHOG:
// 1. Go to PostHog → Feature Flags → Create new flag
// 2. Flag key: "mock_date_scenario"
// 3. Type: Multivariate (string)
// 4. Add variants:
//    - none (default, uses real date)
//    - before_registration
//    - registration_open
//    - any_subject_day (allows access to ANY subject, skips subject date checks)
//    - biology_day
//    - chemistry_day
//    - physics_day
//    - english_language_day
//    - maths_day
//    - english_literature_day
//    - mocks_ended
//    - results_day
// 5. Set rollout to 0% for each variant by default
// 6. Use "Add user override" to assign specific users to test scenarios
//
// USAGE:
// - Testers can use the PostHog toolbar to switch between scenarios
// - The selected scenario overrides the current date for all mock-related checks
// - Both frontend and backend respect the same flag
//

export const MOCK_DATE_FLAG_KEY = "mock_date_scenario";

// Map PostHog flag variants to specific dates (London timezone)
// These should align with the MOCK_DATES and MOCK_SUBJECT_DATES above
export const MOCK_SCENARIO_DATES: Record<string, string> = {
  before_registration: "2025-11-01T12:00:00", // Before registration opens (Nov 3)
  registration_open: "2025-12-01T12:00:00", // Registration open, before mocks start
  any_subject_day: "2025-12-27T12:00:00", // Any subject mock available (skips subject date check)
  biology_day: "2025-12-27T12:00:00", // Biology mock day (Dec 27)
  chemistry_day: "2025-12-28T12:00:00", // Chemistry mock day (Dec 28)
  physics_day: "2025-12-29T12:00:00", // Physics mock day (Dec 29)
  english_language_day: "2025-12-30T12:00:00", // English Language mock day (Dec 30)
  maths_day: "2025-12-31T12:00:00", // Maths mock day (Dec 31)
  english_literature_day: "2026-01-01T12:00:00", // English Literature mock day (Jan 1)
  mocks_ended: "2026-01-03T12:00:00", // After mocks end (Jan 2), before results
  results_day: "2026-01-06T19:00:00", // After results day (Jan 6 6pm + 1hr)
};

// Special scenario that bypasses subject-specific date checks
export const ANY_SUBJECT_DAY_SCENARIO = "any_subject_day";
