/**
 * Email Verification - Crypto utilities (Edge-compatible)
 *
 * Token creation and verification utilities for email verification.
 * Uses Web Crypto API for Edge runtime compatibility.
 */

// ============================================================================
// Types & Constants
// ============================================================================

const TOKEN_TTL_SECONDS = 600; // 10 minutes

interface TokenPayload {
  email: string;
  nonce: string;
  iat: number;
  exp: number;
  purpose: "signup";
  requiresVerification: boolean;
}

export interface VerifySignupTokenResult {
  emailVerified: boolean;
}

// ============================================================================
// Error Class
// ============================================================================

/**
 * Custom error class for verification errors.
 * The code property matches Firebase error code format for consistency.
 */
export class VerificationError extends Error {
  code: string;

  constructor(
    code:
      | "auth/verification-required"
      | "auth/invalid-verification-token"
      | "auth/verification-expired"
      | "auth/invalid-verification-code"
      | "auth/missing-verification-token"
  ) {
    super(code);
    this.code = code;
    this.name = "VerificationError";
  }
}

// ============================================================================
// Base64url utilities (Edge-compatible, no Buffer)
// ============================================================================

function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  // Add padding if needed
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function uint8ArrayToString(arr: Uint8Array): string {
  return new TextDecoder().decode(arr);
}

// ============================================================================
// Cryptographic utilities (Web Crypto API)
// ============================================================================

/**
 * Creates HMAC-SHA256 signature using Web Crypto API.
 */
async function hmacSign(secret: string, data: string): Promise<Uint8Array> {
  const secretBytes = stringToUint8Array(secret);
  const dataBytes = stringToUint8Array(data);
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    dataBytes.buffer as ArrayBuffer
  );
  return new Uint8Array(signature);
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates cryptographically secure random bytes.
 */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

// ============================================================================
// Email utilities
// ============================================================================

/**
 * Normalizes email for consistent comparison.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ============================================================================
// Token secrets
// ============================================================================

function getTokenSecret(): string {
  const secret = process.env.VERIFICATION_TOKEN_SECRET;
  if (!secret) {
    throw new Error("VERIFICATION_TOKEN_SECRET is not configured");
  }
  return secret;
}

function getCodeSecret(): string {
  const secret = process.env.VERIFICATION_CODE_SECRET;
  if (!secret) {
    throw new Error("VERIFICATION_CODE_SECRET is not configured");
  }
  return secret;
}

// ============================================================================
// Token creation and verification
// ============================================================================

/**
 * Derives a 6-digit verification code from the nonce.
 * Uses HMAC-SHA256 with a separate secret for code derivation.
 */
async function deriveVerificationCode(nonce: string): Promise<string> {
  const nonceBytes = base64urlDecode(nonce);
  const mac = await hmacSign(getCodeSecret(), uint8ArrayToString(nonceBytes));

  // Take first 4 bytes as unsigned 32-bit integer (big-endian)
  const num = (mac[0] << 24) | (mac[1] << 16) | (mac[2] << 8) | mac[3];
  // Convert to unsigned and mod 1,000,000 to get 6 digits, pad with leading zeros
  const code = ((num >>> 0) % 1000000).toString().padStart(6, "0");

  return code;
}

/**
 * Creates a signed verification token for email verification.
 * The token contains the requiresVerification flag to inform auth.ts
 * whether code validation is needed.
 *
 * @param email - The email address to create the token for
 * @param requiresVerification - Whether this email requires code verification
 */
export async function createVerificationToken(
  email: string,
  requiresVerification: boolean
): Promise<{
  token: string;
  expiresInSeconds: number;
  code: string;
}> {
  const normalizedEmail = normalizeEmail(email);
  const nonce = base64urlEncode(randomBytes(16));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TOKEN_TTL_SECONDS;

  const payload: TokenPayload = {
    email: normalizedEmail,
    nonce,
    iat,
    exp,
    purpose: "signup",
    requiresVerification,
  };

  const payloadString = JSON.stringify(payload);
  const payloadBase64 = base64urlEncode(stringToUint8Array(payloadString));

  const signatureBytes = await hmacSign(getTokenSecret(), payloadBase64);
  const signature = base64urlEncode(signatureBytes);

  const token = `${payloadBase64}.${signature}`;
  const code = await deriveVerificationCode(nonce);

  return {
    token,
    expiresInSeconds: TOKEN_TTL_SECONDS,
    code,
  };
}

/**
 * Parses and validates a verification token.
 * Returns the payload if valid, throws an error otherwise.
 */
async function parseToken(token: string): Promise<TokenPayload> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new VerificationError("auth/invalid-verification-token");
  }

  const [payloadBase64, signature] = parts;

  // Verify signature using constant-time comparison
  const expectedSignatureBytes = await hmacSign(
    getTokenSecret(),
    payloadBase64
  );
  const expectedSignature = base64urlEncode(expectedSignatureBytes);

  if (!constantTimeEqual(signature, expectedSignature)) {
    throw new VerificationError("auth/invalid-verification-token");
  }

  // Parse payload
  let payload: TokenPayload;
  try {
    const payloadBytes = base64urlDecode(payloadBase64);
    const payloadString = uint8ArrayToString(payloadBytes);
    payload = JSON.parse(payloadString);
  } catch {
    throw new VerificationError("auth/invalid-verification-token");
  }

  // Validate purpose
  if (payload.purpose !== "signup") {
    throw new VerificationError("auth/invalid-verification-token");
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new VerificationError("auth/verification-expired");
  }

  return payload;
}

/**
 * Verifies a signup token and optionally the verification code.
 *
 * Flow:
 * 1. Parse and validate token (signature, purpose, email match, expiry)
 * 2. Read requiresVerification from token payload
 * 3. If requiresVerification=true and no code provided, throw auth/verification-required
 * 4. If requiresVerification=true and code provided, validate it
 * 5. Return { emailVerified: boolean } (true if code was validated)
 *
 * @param token - The verification token from signup/start
 * @param email - The email address to verify against
 * @param code - Optional verification code (required if token has requiresVerification=true)
 * @throws VerificationError if validation fails
 */
export async function verifySignupToken(
  token: string,
  email: string,
  code?: string
): Promise<VerifySignupTokenResult> {
  const payload = await parseToken(token);

  // Verify email matches
  const normalizedEmail = normalizeEmail(email);
  if (payload.email !== normalizedEmail) {
    throw new VerificationError("auth/invalid-verification-token");
  }

  // If verification is not required, we're done - email is not verified
  if (!payload.requiresVerification) {
    return { emailVerified: false };
  }

  // Verification is required - code must be provided
  if (!code) {
    throw new VerificationError("auth/verification-required");
  }

  // Derive expected code and compare using constant-time comparison
  const expectedCode = await deriveVerificationCode(payload.nonce);
  const normalizedCode = code.padStart(6, "0");

  if (!constantTimeEqual(normalizedCode, expectedCode)) {
    throw new VerificationError("auth/invalid-verification-code");
  }

  return { emailVerified: true };
}
