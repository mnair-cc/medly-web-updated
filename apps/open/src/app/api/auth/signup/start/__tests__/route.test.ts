import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * Tests for the signup/start API route.
 * 
 * Note: Tests for the "verification required" flow are limited due to complex
 * module mocking requirements with vitest. The verification token creation
 * and email sending logic is tested indirectly through:
 * 1. E2E tests for the full signup flow
 * 2. Unit tests for verificationToken.ts
 */

// ============================================================================
// Mocks
// ============================================================================

const {
  mockGetUserByEmail,
  mockRequiresEmailVerification,
  mockNormalizeEmail,
  mockCreateVerificationToken,
} = vi.hoisted(() => ({
  mockGetUserByEmail: vi.fn(),
  mockRequiresEmailVerification: vi.fn(),
  mockNormalizeEmail: vi.fn((email: string) => email.trim().toLowerCase()),
  mockCreateVerificationToken: vi.fn().mockResolvedValue({
    token: "test-token",
    code: "123456",
    expiresInSeconds: 600,
  }),
}));

vi.mock("@/app/_lib/firebase/admin", () => ({
  auth: {
    getUserByEmail: mockGetUserByEmail,
  },
}));

vi.mock("@/app/_lib/utils/emailVerification", () => ({
  createVerificationToken: mockCreateVerificationToken,
  normalizeEmail: mockNormalizeEmail,
}));

vi.mock("@/app/_lib/utils/emailVerificationConfig", () => ({
  requiresEmailVerification: mockRequiresEmailVerification,
}));

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: vi.fn().mockResolvedValue({ error: null }) };
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

const createMockRequest = (body: Record<string, unknown>): Request => {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Request;
};

// ============================================================================
// Tests
// ============================================================================

describe("POST /api/auth/signup/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Default: user doesn't exist
    mockGetUserByEmail.mockRejectedValue(
      new Error("There is no user record corresponding to this identifier")
    );
    // Default: verification not required
    mockRequiresEmailVerification.mockResolvedValue(false);
  });

  describe("email validation", () => {
    it("returns 400 for missing email", async () => {
      const { POST } = await import("../route");
      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("invalid_email");
    });

    it("returns 400 for invalid email format", async () => {
      const { POST } = await import("../route");
      const request = createMockRequest({ email: "not-an-email" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("invalid_email");
    });

    it("returns 400 for email without domain", async () => {
      const { POST } = await import("../route");
      const request = createMockRequest({ email: "test@" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("invalid_email");
    });

    it("returns 400 for non-string email", async () => {
      const { POST } = await import("../route");
      const request = createMockRequest({ email: 12345 });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("invalid_email");
    });
  });

  describe("existing user check", () => {
    it("returns 409 when email is already registered", async () => {
      mockGetUserByEmail.mockResolvedValue({ uid: "existing-user-id" });

      const { POST } = await import("../route");
      const request = createMockRequest({ email: "existing@example.com" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("email_already_registered");
      expect(mockGetUserByEmail).toHaveBeenCalledWith("existing@example.com");
    });

    it("normalizes email before checking Firebase", async () => {
      const { POST } = await import("../route");
      const request = createMockRequest({ email: "TEST@EXAMPLE.COM" });

      await POST(request);

      expect(mockGetUserByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("handles unexpected Firebase errors", async () => {
      mockGetUserByEmail.mockRejectedValue(new Error("Connection failed"));

      const { POST } = await import("../route");
      const request = createMockRequest({ email: "test@example.com" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("internal_error");
    });
  });

  describe("verification not required", () => {
    it("returns requires_verification: false when not required", async () => {
      mockRequiresEmailVerification.mockResolvedValue(false);

      const { POST } = await import("../route");
      const request = createMockRequest({ email: "test@gmail.com" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requires_verification).toBe(false);
      // Token is always returned (with requiresVerification flag embedded)
      expect(data.verification_token).toBe("test-token");
    });

    it("accepts uppercase emails and normalizes them", async () => {
      mockRequiresEmailVerification.mockResolvedValue(false);

      const { POST } = await import("../route");
      const request = createMockRequest({ email: "TEST@GMAIL.COM" });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requires_verification).toBe(false);
    });
  });

  describe("error handling", () => {
    it("returns 500 for JSON parse errors", async () => {
      const { POST } = await import("../route");
      const request = {
        json: vi.fn().mockRejectedValue(new SyntaxError("Invalid JSON")),
      } as unknown as Request;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("internal_error");
    });
  });
});
