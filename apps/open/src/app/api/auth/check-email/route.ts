import { auth as firebaseAdminAuth } from "@/app/_lib/firebase/admin";
import { normalizeEmail } from "@/app/_lib/utils/emailVerification";
import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    // Validate email format
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if email exists in Firebase Auth
    try {
      await firebaseAdminAuth.getUserByEmail(normalizedEmail);
      // If we get here, user exists
      return NextResponse.json({ exists: true });
    } catch (error) {
      // User not found
      if (
        error instanceof Error &&
        error.message.includes("no user record")
      ) {
        return NextResponse.json({ exists: false });
      }
      // Re-throw unexpected errors
      throw error;
    }
  } catch (error) {
    console.error("Error in check-email:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
