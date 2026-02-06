import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * Tests for emailVerificationConfig.ts
 * - requiresEmailVerification (config decision logic)
 */

// ============================================================================
// Mocks
// ============================================================================

const mockGetRemoteConfigPayload = vi.fn();

vi.mock("@/app/_lib/posthog/server", () => ({
  default: {
    getRemoteConfigPayload: mockGetRemoteConfigPayload,
  },
}));

vi.mock("@/app/_lib/data/uni-email-domains.json", () => ({
  default: {
    domains: ["edu", "ac.uk", "ox.ac.uk", "harvard.edu", "mit.edu"],
  },
}));

// ============================================================================
// Import module
// ============================================================================

import { requiresEmailVerification } from "../emailVerificationConfig";

// ============================================================================
// Tests
// ============================================================================

describe("emailVerificationConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requiresEmailVerification", () => {
    // PostHog payload is now a simple string: "always" | "never" | "uni_only"

    it("returns false when PostHog returns null", async () => {
      mockGetRemoteConfigPayload.mockResolvedValue(null);
      const result = await requiresEmailVerification("test@harvard.edu");
      expect(result).toBe(false);
    });

    it('returns true when PostHog returns "always"', async () => {
      mockGetRemoteConfigPayload.mockResolvedValue("always");
      const result = await requiresEmailVerification("test@gmail.com");
      expect(result).toBe(true);
    });

    it('returns false when PostHog returns "never"', async () => {
      mockGetRemoteConfigPayload.mockResolvedValue("never");
      const result = await requiresEmailVerification("test@harvard.edu");
      expect(result).toBe(false);
    });

    it('returns true for uni email when PostHog returns "uni_only"', async () => {
      mockGetRemoteConfigPayload.mockResolvedValue("uni_only");
      const result = await requiresEmailVerification("student@harvard.edu");
      expect(result).toBe(true);
    });

    it('returns false for non-uni email when PostHog returns "uni_only"', async () => {
      mockGetRemoteConfigPayload.mockResolvedValue("uni_only");
      const result = await requiresEmailVerification("test@gmail.com");
      expect(result).toBe(false);
    });

    it("handles PostHog errors gracefully", async () => {
      mockGetRemoteConfigPayload.mockRejectedValue(new Error("Network error"));
      const result = await requiresEmailVerification("test@harvard.edu");
      expect(result).toBe(false);
    });

    it("returns false for invalid payload format (object)", async () => {
      mockGetRemoteConfigPayload.mockResolvedValue({ enabled: true });
      const result = await requiresEmailVerification("test@harvard.edu");
      expect(result).toBe(false);
    });

    it("returns false for invalid payload format (unknown string)", async () => {
      mockGetRemoteConfigPayload.mockResolvedValue("invalid-string");
      const result = await requiresEmailVerification("test@harvard.edu");
      expect(result).toBe(false);
    });

    it("returns false for array payload", async () => {
      mockGetRemoteConfigPayload.mockResolvedValue(["always"]);
      const result = await requiresEmailVerification("test@harvard.edu");
      expect(result).toBe(false);
    });

    describe("university email detection (uni_only mode)", () => {
      beforeEach(() => {
        mockGetRemoteConfigPayload.mockResolvedValue("uni_only");
      });

      it("recognizes exact domain match (harvard.edu)", async () => {
        expect(await requiresEmailVerification("student@harvard.edu")).toBe(
          true
        );
      });

      it("recognizes subdomain match (student.ox.ac.uk matches ac.uk)", async () => {
        expect(await requiresEmailVerification("john@student.ox.ac.uk")).toBe(
          true
        );
      });

      it("recognizes generic .edu domain", async () => {
        expect(await requiresEmailVerification("user@university.edu")).toBe(
          true
        );
      });

      it("rejects non-university domains", async () => {
        expect(await requiresEmailVerification("user@gmail.com")).toBe(false);
        expect(await requiresEmailVerification("user@company.com")).toBe(false);
      });

      it("handles email without @ symbol", async () => {
        expect(await requiresEmailVerification("invalid-email")).toBe(false);
      });

      it("normalizes email before checking domain", async () => {
        expect(await requiresEmailVerification("  STUDENT@HARVARD.EDU  ")).toBe(
          true
        );
      });
    });
  });
});
