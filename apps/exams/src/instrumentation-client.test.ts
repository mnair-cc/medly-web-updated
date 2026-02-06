import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Sentry from "@sentry/nextjs";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: "BrowserTracing" })),
  featureFlagsIntegration: vi.fn(() => ({ name: "FeatureFlags" })),
  getClient: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));

vi.mock("../sentry.shared.config", () => ({
  isTestEnvironment: false,
  sharedSentryConfig: { dsn: "test-dsn", tracesSampleRate: 0.1 },
}));

describe("instrumentation-client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("initializes Sentry with shared config and integrations", async () => {
    await import("./instrumentation-client");

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "test-dsn",
        tracesSampleRate: 0.1,
        integrations: expect.arrayContaining([
          expect.objectContaining({ name: "BrowserTracing" }),
          expect.objectContaining({ name: "FeatureFlags" }),
        ]),
        tracePropagationTargets: expect.arrayContaining(["localhost"]),
      })
    );
  });

  it("exports onRouterTransitionStart", async () => {
    const module = await import("./instrumentation-client");
    expect(module.onRouterTransitionStart).toBe(
      Sentry.captureRouterTransitionStart
    );
  });
});
