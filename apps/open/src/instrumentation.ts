import * as Sentry from "@sentry/nextjs";
import { sharedSentryConfig } from "../sentry.shared.config";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      ...sharedSentryConfig,
      // Server-specific overrides go here
      enableLogs: true,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      ...sharedSentryConfig,
      // Edge-specific overrides go here
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
