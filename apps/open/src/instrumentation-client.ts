// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sharedSentryConfig } from "../sentry.shared.config";

Sentry.init({
  ...sharedSentryConfig,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.featureFlagsIntegration(),
  ],
  // Propagate traces to same-origin and the curriculum API backend
  tracePropagationTargets: [
    "localhost",
    /^\//, // Same-origin relative URLs
    new RegExp(`^${process.env.NEXT_PUBLIC_CURRICULUM_API_URL}`),
  ],
});

// =============================================================================
// POSTHOG FEATURE FLAGS SYNC
// =============================================================================

type PostHogInstance = {
  onFeatureFlags: (
    callback: (
      flags: string[],
      variants: Record<string, string | boolean>,
    ) => void,
  ) => void;
};

function syncPostHogFlagsToSentry() {
  if (typeof window === "undefined") return;

  const trySync = () => {
    const posthog = (window as { posthog?: PostHogInstance }).posthog;
    if (!posthog?.onFeatureFlags) return false;

    posthog.onFeatureFlags((flags, variants) => {
      const integration =
        Sentry.getClient()?.getIntegrationByName<Sentry.FeatureFlagsIntegration>(
          "FeatureFlags",
        );
      if (!integration) return;

      for (const flag of flags) {
        const value = variants[flag];
        integration.addFeatureFlag(
          flag,
          typeof value === "boolean" ? value : value !== "false" && !!value,
        );
      }
    });
    return true;
  };

  // Try immediately, then poll for up to 5 seconds
  if (trySync()) return;

  let attempts = 0;
  const interval = setInterval(() => {
    if (trySync() || ++attempts >= 50) {
      clearInterval(interval);
    }
  }, 100);
}

syncPostHogFlagsToSentry();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
