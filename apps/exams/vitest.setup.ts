import "@testing-library/jest-dom/vitest";

// Set up env vars for verificationToken tests
process.env.VERIFICATION_TOKEN_SECRET = "test-token-secret-32-chars-long!";
process.env.VERIFICATION_CODE_SECRET = "test-code-secret-32-chars-long!!";
process.env.SIGNUP_EMAIL_VERIFICATION = "posthog_conditional";

