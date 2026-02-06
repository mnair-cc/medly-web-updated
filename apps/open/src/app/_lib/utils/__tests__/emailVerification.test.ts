import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * Tests for emailVerification.ts (crypto utilities)
 * - normalizeEmail
 * - VerificationError
 * - createVerificationToken
 * - verifySignupToken
 */

// ============================================================================
// Helper functions for testing
// ============================================================================

function base64urlDecode(str: string): Uint8Array {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return new Uint8Array(signature);
}

// ============================================================================
// Import module (env vars are set in vitest.setup.ts)
// ============================================================================

import {
  normalizeEmail,
  createVerificationToken,
  verifySignupToken,
  VerificationError,
} from "../emailVerification";

// ============================================================================
// Tests
// ============================================================================

describe("emailVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeEmail", () => {
    it("converts email to lowercase", () => {
      expect(normalizeEmail("Test@Example.COM")).toBe("test@example.com");
    });

    it("trims whitespace", () => {
      expect(normalizeEmail("  test@example.com  ")).toBe("test@example.com");
    });

    it("handles already normalized email", () => {
      expect(normalizeEmail("test@example.com")).toBe("test@example.com");
    });
  });

  describe("VerificationError", () => {
    it("creates error with correct name and code", () => {
      const error = new VerificationError("auth/verification-required");

      expect(error.name).toBe("VerificationError");
      expect(error.code).toBe("auth/verification-required");
      expect(error.message).toBe("auth/verification-required");
    });

    it("supports all error codes", () => {
      const codes = [
        "auth/verification-required",
        "auth/invalid-verification-token",
        "auth/verification-expired",
        "auth/invalid-verification-code",
        "auth/missing-verification-token",
      ] as const;

      for (const code of codes) {
        const error = new VerificationError(code);
        expect(error.code).toBe(code);
      }
    });
  });

  describe("createVerificationToken", () => {
    it("creates a valid token with expected structure (requiresVerification=true)", async () => {
      const result = await createVerificationToken("test@example.com", true);

      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("code");
      expect(result).toHaveProperty("expiresInSeconds");
      expect(result.expiresInSeconds).toBe(600);
    });

    it("creates a valid token with expected structure (requiresVerification=false)", async () => {
      const result = await createVerificationToken("test@example.com", false);

      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("code");
      expect(result).toHaveProperty("expiresInSeconds");
      expect(result.expiresInSeconds).toBe(600);
    });

    it("generates a 6-digit code", async () => {
      const result = await createVerificationToken("test@example.com", true);
      expect(result.code).toMatch(/^\d{6}$/);
    });

    it("creates token in base64url.signature format", async () => {
      const result = await createVerificationToken("test@example.com", true);

      const parts = result.token.split(".");
      expect(parts).toHaveLength(2);
      expect(() => base64urlDecode(parts[0])).not.toThrow();
    });

    it("normalizes email before creating token", async () => {
      const result1 = await createVerificationToken("Test@Example.com", true);
      const result2 = await createVerificationToken(
        "  TEST@EXAMPLE.COM  ",
        true
      );

      const payload1 = JSON.parse(
        new TextDecoder().decode(base64urlDecode(result1.token.split(".")[0]))
      );
      const payload2 = JSON.parse(
        new TextDecoder().decode(base64urlDecode(result2.token.split(".")[0]))
      );

      expect(payload1.email).toBe("test@example.com");
      expect(payload2.email).toBe("test@example.com");
    });

    it("includes purpose=signup in token payload", async () => {
      const result = await createVerificationToken("test@example.com", true);

      const payload = JSON.parse(
        new TextDecoder().decode(base64urlDecode(result.token.split(".")[0]))
      );
      expect(payload.purpose).toBe("signup");
    });

    it("includes requiresVerification=true in token payload when set", async () => {
      const result = await createVerificationToken("test@example.com", true);

      const payload = JSON.parse(
        new TextDecoder().decode(base64urlDecode(result.token.split(".")[0]))
      );
      expect(payload.requiresVerification).toBe(true);
    });

    it("includes requiresVerification=false in token payload when set", async () => {
      const result = await createVerificationToken("test@example.com", false);

      const payload = JSON.parse(
        new TextDecoder().decode(base64urlDecode(result.token.split(".")[0]))
      );
      expect(payload.requiresVerification).toBe(false);
    });

    it("generates unique nonces for each call", async () => {
      const result1 = await createVerificationToken("test@example.com", true);
      const result2 = await createVerificationToken("test@example.com", true);

      expect(result1.token).not.toBe(result2.token);
      expect(result1.code).not.toBe(result2.code);
    });
  });

  describe("verifySignupToken", () => {
    describe("when requiresVerification=true", () => {
      it("successfully verifies a valid token and code", async () => {
        const { token, code } = await createVerificationToken(
          "test@example.com",
          true
        );

        const result = await verifySignupToken(token, "test@example.com", code);
        expect(result.emailVerified).toBe(true);
      });

      it("verifies with normalized email", async () => {
        const { token, code } = await createVerificationToken(
          "test@example.com",
          true
        );

        const result = await verifySignupToken(
          token,
          "  TEST@EXAMPLE.COM  ",
          code
        );
        expect(result.emailVerified).toBe(true);
      });

      it("throws auth/verification-required when code is not provided", async () => {
        const { token } = await createVerificationToken(
          "test@example.com",
          true
        );

        await expect(
          verifySignupToken(token, "test@example.com")
        ).rejects.toMatchObject({
          code: "auth/verification-required",
        });
      });

      it("throws auth/invalid-verification-code for wrong code", async () => {
        const { token, code } = await createVerificationToken(
          "test@example.com",
          true
        );

        const wrongCode = code === "000000" ? "111111" : "000000";

        await expect(
          verifySignupToken(token, "test@example.com", wrongCode)
        ).rejects.toMatchObject({
          code: "auth/invalid-verification-code",
        });
      });
    });

    describe("when requiresVerification=false", () => {
      it("returns emailVerified=false without code", async () => {
        const { token } = await createVerificationToken(
          "test@example.com",
          false
        );

        const result = await verifySignupToken(token, "test@example.com");
        expect(result.emailVerified).toBe(false);
      });

      it("returns emailVerified=false even with code provided", async () => {
        const { token, code } = await createVerificationToken(
          "test@example.com",
          false
        );

        const result = await verifySignupToken(token, "test@example.com", code);
        expect(result.emailVerified).toBe(false);
      });
    });

    describe("token validation", () => {
      it("throws auth/invalid-verification-token for malformed token", async () => {
        await expect(
          verifySignupToken("invalid-token", "test@example.com", "123456")
        ).rejects.toMatchObject({
          code: "auth/invalid-verification-token",
        });
      });

      it("throws auth/invalid-verification-token for invalid signature", async () => {
        const { token, code } = await createVerificationToken(
          "test@example.com",
          true
        );

        const [payload, signature] = token.split(".");
        const tamperedSig = signature.slice(0, -4) + "XXXX";
        const tamperedToken = `${payload}.${tamperedSig}`;

        await expect(
          verifySignupToken(tamperedToken, "test@example.com", code)
        ).rejects.toMatchObject({
          code: "auth/invalid-verification-token",
        });
      });

      it("throws auth/invalid-verification-token for wrong email", async () => {
        const { token, code } = await createVerificationToken(
          "test@example.com",
          true
        );

        await expect(
          verifySignupToken(token, "different@example.com", code)
        ).rejects.toMatchObject({
          code: "auth/invalid-verification-token",
        });
      });

      it("throws auth/verification-expired for expired token", async () => {
        const TEST_TOKEN_SECRET = "test-token-secret-32-chars-long!";

        const payload = {
          email: "test@example.com",
          nonce: base64urlEncode(crypto.getRandomValues(new Uint8Array(16))),
          iat: Math.floor(Date.now() / 1000) - 700,
          exp: Math.floor(Date.now() / 1000) - 100,
          purpose: "signup",
          requiresVerification: true,
        };

        const payloadString = JSON.stringify(payload);
        const payloadBase64 = base64urlEncode(
          new TextEncoder().encode(payloadString)
        );
        const signatureBytes = await hmacSign(TEST_TOKEN_SECRET, payloadBase64);
        const signature = base64urlEncode(signatureBytes);

        const expiredToken = `${payloadBase64}.${signature}`;

        await expect(
          verifySignupToken(expiredToken, "test@example.com", "123456")
        ).rejects.toMatchObject({
          code: "auth/verification-expired",
        });
      });

      it("throws auth/invalid-verification-token for wrong purpose", async () => {
        const TEST_TOKEN_SECRET = "test-token-secret-32-chars-long!";

        const payload = {
          email: "test@example.com",
          nonce: base64urlEncode(crypto.getRandomValues(new Uint8Array(16))),
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 600,
          purpose: "reset-password",
          requiresVerification: true,
        };

        const payloadString = JSON.stringify(payload);
        const payloadBase64 = base64urlEncode(
          new TextEncoder().encode(payloadString)
        );
        const signatureBytes = await hmacSign(TEST_TOKEN_SECRET, payloadBase64);
        const signature = base64urlEncode(signatureBytes);

        const token = `${payloadBase64}.${signature}`;

        await expect(
          verifySignupToken(token, "test@example.com", "123456")
        ).rejects.toMatchObject({
          code: "auth/invalid-verification-token",
        });
      });
    });
  });

  describe("token security", () => {
    it("cannot verify token with tampered payload", async () => {
      const { token, code } = await createVerificationToken(
        "test@example.com",
        true
      );

      const [payloadBase64, signature] = token.split(".");
      const payload = JSON.parse(
        new TextDecoder().decode(base64urlDecode(payloadBase64))
      );
      payload.email = "hacker@evil.com";
      const tamperedPayload = base64urlEncode(
        new TextEncoder().encode(JSON.stringify(payload))
      );
      const tamperedToken = `${tamperedPayload}.${signature}`;

      await expect(
        verifySignupToken(tamperedToken, "hacker@evil.com", code)
      ).rejects.toMatchObject({
        code: "auth/invalid-verification-token",
      });
    });

    it("cannot bypass verification by tampering requiresVerification", async () => {
      const { token } = await createVerificationToken("test@example.com", true);

      const [payloadBase64, signature] = token.split(".");
      const payload = JSON.parse(
        new TextDecoder().decode(base64urlDecode(payloadBase64))
      );
      payload.requiresVerification = false;
      const tamperedPayload = base64urlEncode(
        new TextEncoder().encode(JSON.stringify(payload))
      );
      const tamperedToken = `${tamperedPayload}.${signature}`;

      await expect(
        verifySignupToken(tamperedToken, "test@example.com")
      ).rejects.toMatchObject({
        code: "auth/invalid-verification-token",
      });
    });
  });
});
