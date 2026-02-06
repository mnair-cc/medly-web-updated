/**
 * Shared Sentry configuration defaults for client, server, and edge runtimes.
 * Each runtime imports these defaults and can override as needed.
 */

// Sentry DSN - same across all runtimes
export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "https://9afebad4fed942d14fd30a5bb5c58676@o4510436918362112.ingest.de.sentry.io/4510459205648465";

// Environment detection helper
export const ENVIRONMENT =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV;
function parseSampleRate(
  envValue: string | undefined,
  defaultValue: number,
): number {
  if (!envValue) return defaultValue;
  const parsed = Number(envValue);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) return defaultValue;
  return parsed;
}

const SENTRY_SAMPLE_RATE = parseSampleRate(
  process.env.NEXT_PUBLIC_SENTRY_SAMPLE_RATE,
  0.4,
);
const SENTRY_TRACES_SAMPLE_RATE = parseSampleRate(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  0.02,
);

export const isTestEnvironment =
  ENVIRONMENT === "development" ||
  ENVIRONMENT === "staging" ||
  ENVIRONMENT === "localhost";

/**
 * Shared base configuration that applies to all runtimes.
 * Each runtime can spread this and override specific values.
 */
export const sharedSentryConfig = {
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,

  // Error event sampling: 100% in dev, 40% in prod
  sampleRate: isTestEnvironment ? 1 : SENTRY_SAMPLE_RATE,

  // Performance/trace sampling: 100% in dev, 1% in prod
  tracesSampleRate: isTestEnvironment ? 1 : SENTRY_TRACES_SAMPLE_RATE,

  // Enable logs to be sent to Sentry
  enableLogs: isTestEnvironment ? true : false,

  // Enable sending user PII (email, username, etc.)
  sendDefaultPii: true,
} as const;
