"use client";

import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";
import { getAuthErrorMessage } from "@/app/_lib/utils/authErrors";
import { providerMap } from "@/auth";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Input from "../../_components/Input";

type Step = "form" | "code";

type FieldErrors = {
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
};

type FieldTouched = {
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Form = ({ formType }: { formType: "signup" | "login" }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const codeFormRef = useRef<HTMLFormElement>(null);

  // Field-level validation state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    email: null,
    password: null,
    confirmPassword: null,
  });
  const [touched, setTouched] = useState<FieldTouched>({
    email: false,
    password: false,
    confirmPassword: false,
  });

  // Verification flow state
  const [step, setStep] = useState<Step>("form");
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [canResendAt, setCanResendAt] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number | null>(null);

  const RESEND_COOLDOWN_SECONDS = 120; // 2 minutes

  // Validation functions
  const validateEmail = (value: string): string | null => {
    if (!value) return "Email is required";
    if (!EMAIL_REGEX.test(value)) return "Please enter a valid email address";
    return null;
  };

  const validatePasswordField = (value: string): string | null => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    return null;
  };

  const validateConfirmPassword = (
    value: string,
    passwordValue: string
  ): string | null => {
    if (!value) return "Please confirm your password";
    if (value !== passwordValue) return "Passwords do not match";
    return null;
  };

  // Blur handlers
  const handleEmailBlur = async () => {
    setTouched((prev) => ({ ...prev, email: true }));

    // First check format validation
    const formatError = validateEmail(email);
    if (formatError) {
      setFieldErrors((prev) => ({ ...prev, email: formatError }));
      return;
    }

    // For signup, check if email is already registered
    if (formType === "signup") {
      try {
        const res = await fetch(
          `/api/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`
        );
        const data = await res.json();
        if (data.exists) {
          setFieldErrors((prev) => ({
            ...prev,
            email: "This email is already registered. Please log in instead.",
          }));
          return;
        }
      } catch {
        // If check fails, don't block - let the submit handle it
      }
    }

    // Clear any existing error
    setFieldErrors((prev) => ({ ...prev, email: null }));
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    setFieldErrors((prev) => ({
      ...prev,
      password: validatePasswordField(password),
    }));
    // Re-validate confirmPassword if it was already touched and has a value
    if (touched.confirmPassword && confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(confirmPassword, password),
      }));
    }
  };

  const handleConfirmPasswordBlur = () => {
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
    // Only validate if both fields have values
    if (password && confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(confirmPassword, password),
      }));
    }
  };

  // Change handlers with error clearing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      setFieldErrors((prev) => ({
        ...prev,
        password: validatePasswordField(value),
      }));
    }
    // Re-validate confirmPassword if it was already touched
    if (touched.confirmPassword && confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(confirmPassword, value),
      }));
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (touched.confirmPassword && password) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(value, password),
      }));
    }
  };

  // Capture referrer ID from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      setReferrerId(ref);
    }
  }, []);

  // Countdown timer for verification code expiry
  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000)
      );
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Token expired - reset to step 1
        setStep("form");
        setVerificationToken(null);
        setVerificationCode("");
        setExpiresAt(null);
        setCanResendAt(null);
        setResendCooldown(null);
        setError("Verification code expired. Please try again.");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (!canResendAt) {
      setResendCooldown(null);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(
        0,
        Math.floor((canResendAt - Date.now()) / 1000)
      );
      setResendCooldown(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [canResendAt]);

  const validatePassword = () => {
    // Mark all fields as touched and validate
    setTouched({ email: true, password: true, confirmPassword: true });

    const emailError = validateEmail(email);
    const passwordError = validatePasswordField(password);
    const confirmError = validateConfirmPassword(confirmPassword, password);

    setFieldErrors({
      email: emailError,
      password: passwordError,
      confirmPassword: confirmError,
    });

    if (emailError || passwordError || confirmError) {
      return false;
    }
    return true;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const maskEmail = (email: string): string => {
    const [local, domain] = email.split("@");
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}${local[1]}***@${domain}`;
  };

  const handleStartVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError("This email is already registered. Please log in instead.");
        return;
      }

      if (res.status === 400) {
        setError("Please enter a valid email address.");
        return;
      }

      if (!res.ok) {
        setError("Failed to send verification email. Please try again.");
        return;
      }

      // Token is always returned now
      const token = data.verification_token;

      if (!data.requires_verification) {
        // No verification needed - sign up immediately with token (no code)
        await handleCredentialsSignIn(token, null);
      } else {
        // Verification required - show code input
        setVerificationToken(token);
        setExpiresAt(Date.now() + data.expires_in_seconds * 1000);
        setCanResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
        setStep("code");
      }
    } catch (err) {
      console.error("Error starting verification:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setVerificationCode("");
    setError(null);
    await handleStartVerification();
  };

  const handleBackToForm = () => {
    setStep("form");
    setVerificationToken(null);
    setVerificationCode("");
    setExpiresAt(null);
    setCanResendAt(null);
    setResendCooldown(null);
    setError(null);
  };

  const handleCredentialsSignIn = async (
    token: string | null,
    code: string | null
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        isSignUp: formType === "signup",
        verificationToken: token ?? undefined,
        verificationCode: code ?? undefined,
      });

      if (result?.error) {
        const errorCode =
          result.code ||
          (typeof result.error === "string"
            ? result.error
            : "auth/unknown-error");
        setError(getAuthErrorMessage(errorCode));
        return;
      }

      if (result?.ok) {
        if (referrerId) {
          const domain = window.location.hostname
            .split(".")
            .slice(-2)
            .join(".");
          document.cookie = `referrerId=${referrerId}; path=/; domain=.${domain}; max-age=2592000`;
        }
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Authentication error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(getAuthErrorMessage(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, providerId: string) => {
    e.preventDefault();

    if (formType === "signup" && providerId === "credentials") {
      if (!validatePassword()) return;

      if (!agreeToTerms) {
        setError("You must agree to the Terms and Conditions");
        return;
      }

      // Start verification flow instead of direct signup
      await handleStartVerification();
      return;
    }

    // Login flow - no verification needed
    if (providerId === "credentials") {
      await handleCredentialsSignIn(null, null);
      return;
    }

    // OAuth providers
    setIsLoading(true);
    try {
      setError(null);
      const callbackUrl = referrerId ? `/?ref=${referrerId}` : "/";
      await signIn(providerId, { callbackUrl });
    } catch (err) {
      console.error("Authentication error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(getAuthErrorMessage(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    if (timeRemaining === 0) {
      setError("Verification code expired. Please request a new code.");
      return;
    }

    await handleCredentialsSignIn(verificationToken, verificationCode);
  };

  // Code verification step UI
  if (step === "code" && formType === "signup") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="text-gray-600 text-sm">
            We sent a verification code to{" "}
            <span className="font-medium">{maskEmail(email)}</span>
          </p>
        </div>

        <form
          ref={codeFormRef}
          onSubmit={handleCodeSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setVerificationCode(value);
              }}
              autoFocus
              className="w-full py-4 border rounded-2xl text-center bg-[#F9F9FB] focus:outline-[#05B0FF] font-medium tracking-[0.5em] text-lg"
            />
          </div>

          {timeRemaining !== null && timeRemaining > 0 && (
            <p className="text-sm text-gray-500 text-center">
              Code expires in {formatTime(timeRemaining)}
            </p>
          )}

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="hidden"
            aria-hidden="true"
          />
          <div
            onClick={() => {
              if (codeFormRef.current && !isLoading) {
                codeFormRef.current.requestSubmit();
              }
            }}
          >
            <PrimaryButtonClicky
              buttonText="Verify & Sign Up"
              disabled={isLoading || verificationCode.length !== 6}
              isLoading={isLoading}
              doesStretch={true}
              showKeyboardShortcut={false}
              buttonState="filled"
            />
          </div>
        </form>

        <div className="flex flex-col items-center gap-2">
          {resendCooldown !== null && resendCooldown > 0 ? (
            <p className="text-sm text-gray-400">
              Resend code in {formatTime(resendCooldown)}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="text-sm text-[#05B0FF] hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          )}
          <button
            type="button"
            onClick={handleBackToForm}
            disabled={isLoading}
            className="text-sm text-gray-500 hover:underline disabled:opacity-50"
          >
            Back to edit email
          </button>
        </div>
      </div>
    );
  }

  // Main form UI (email + password)
  return (
    <>
      <div className="flex flex-col gap-4">
        {Object.values(providerMap).map((provider) => (
          <form
            key={provider.id}
            method="post"
            onSubmit={(e) => handleSubmit(e, provider.id)}
          >
            <button
              className="w-full py-4 rounded-2xl text-center focus:outline-[#05B0FF] font-medium bg-white text-black border flex items-center justify-center gap-2"
              type="submit"
              disabled={isLoading}
            >
              <Image
                src={`${provider.icon}`}
                alt={`${provider.name} logo`}
                width={15}
                height={15}
              />
              <span>Continue with {provider.name}</span>
            </button>
          </form>
        ))}
      </div>
      <div className="flex items-center gap-4 my-4">
        <div className="h-px flex-1 bg-gray-200"></div>
        <div className="text-center text-sm text-gray-500">or</div>
        <div className="h-px flex-1 bg-gray-200"></div>
      </div>
      <form
        ref={formRef}
        method="post"
        className="space-y-4"
        onSubmit={(e) => handleSubmit(e, "credentials")}
      >
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          placeholder="Email"
          value={email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={fieldErrors.email}
          touched={touched.email}
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          required
          placeholder="Password"
          value={password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          error={fieldErrors.password}
          touched={touched.password}
        />

        {formType === "signup" && (
          <>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              required
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              onBlur={handleConfirmPasswordBlur}
              error={fieldErrors.confirmPassword}
              touched={touched.confirmPassword}
            />
            <div className="flex justify-center items-center gap-2">
              <input
                type="checkbox"
                id="terms"
                className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                required
              />
              <label htmlFor="terms" className="text-sm">
                I agree to the Terms and Conditions
              </label>
            </div>
          </>
        )}

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="hidden"
          aria-hidden="true"
        />
        <div
          onClick={() => {
            if (formRef.current && !isLoading) {
              formRef.current.requestSubmit();
            }
          }}
        >
          <PrimaryButtonClicky
            buttonText={formType === "signup" ? "Sign up" : "Log in"}
            disabled={isLoading}
            isLoading={isLoading}
            doesStretch={true}
            showKeyboardShortcut={false}
            buttonState="filled"
          />
        </div>
      </form>
      <div className="flex justify-center mt-2">
        <Link
          href="/auth/reset-password"
          className="text-sm underline text-center"
        >
          Forgot your password?
        </Link>
      </div>
    </>
  );
};
