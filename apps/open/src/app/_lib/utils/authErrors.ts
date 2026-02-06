export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    // Sign up errors
    case "auth/email-already-in-use":
      return "This email is already registered. Please try signing in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";

    // Sign in errors
    case "auth/user-not-found":
      return "No account found with this email. Please sign up instead.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid credentials. Please try again.";

    // Email verification errors
    case "auth/verification-required":
      return "Email verification required. Please enter the code sent to your email.";
    case "auth/invalid-verification-token":
      return "Invalid verification. Please request a new code.";
    case "auth/verification-expired":
      return "Verification code expired. Please request a new code.";
    case "auth/invalid-verification-code":
      return "Invalid verification code. Please try again.";

    case "auth/unknown-error":
    default:
      return "An unexpected error occurred. Please try again.";
  }
};
