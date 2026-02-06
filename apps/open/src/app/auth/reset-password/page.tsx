"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth as firebaseAuth } from "@/app/_lib/firebase/client";
import { Header } from "../_components/Header";
import { getAuthErrorMessage } from "@/app/_lib/utils/authErrors";
import Input from "@/app/_components/Input";
import PrimaryButton from "@/app/_components/PrimaryButton";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ResetPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Field-level validation state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const validateEmail = (value: string): string | null => {
    if (!value) return "Email is required";
    if (!EMAIL_REGEX.test(value)) return "Please enter a valid email address";
    return null;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailTouched) {
      setEmailError(validateEmail(value));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate on submit
    setEmailTouched(true);
    const emailValidationError = validateEmail(email);
    setEmailError(emailValidationError);

    if (emailValidationError) {
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      setSuccess(true);
    } catch (error) {
      console.error("Password reset error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(getAuthErrorMessage(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header
        title="Reset your password"
        subtitle={{
          text: "Remember your password?",
          linkText: "Log in",
          linkHref: "/auth/login",
        }}
      />
      {success ? (
        <div className="mt-4 text-center">
          <p>Check your email for a link to reset your password.</p>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            error={emailError}
            touched={emailTouched}
          />
          <PrimaryButton type="submit" disabled={isLoading}>
            Send reset link
          </PrimaryButton>
          {error && (
            <div className="text-[#ff4b4c] text-sm text-center">{error}</div>
          )}
        </form>
      )}
    </>
  );
};

export default ResetPasswordPage;
