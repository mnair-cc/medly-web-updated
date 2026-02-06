import { auth as firebaseAdminAuth } from "@/app/_lib/firebase/admin";
import {
  normalizeEmail,
  createVerificationToken,
} from "@/app/_lib/utils/emailVerification";
import { requiresEmailVerification } from "@/app/_lib/utils/emailVerificationConfig";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email format
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if email already exists in Firebase Auth
    try {
      await firebaseAdminAuth.getUserByEmail(normalizedEmail);
      // If we get here, user exists
      return NextResponse.json(
        { error: "email_already_registered" },
        { status: 409 }
      );
    } catch (error) {
      // User not found is expected - continue
      if (
        !(error instanceof Error) ||
        !error.message.includes("no user record")
      ) {
        // Re-throw unexpected errors
        throw error;
      }
    }

    // Check if verification is required for this email
    const verificationRequired =
      await requiresEmailVerification(normalizedEmail);

    // Generate verification token (always, with requiresVerification flag)
    const { token, expiresInSeconds, code } = await createVerificationToken(
      normalizedEmail,
      verificationRequired
    );

    // Only send verification email if verification is required
    if (verificationRequired) {
      const { error: emailError } = await resend.emails.send({
        from: "Medly <no-reply@medlyai.com>",
        to: [normalizedEmail],
        subject: "Your Medly verification code",
        html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; color: #484848;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://app.medlyai.com/logo_square_black.png" alt="Medly" style="width: 60px; height: auto; margin-bottom: 24px;">
            <h1 style="color: #1C1C1E; font-size: 24px; font-weight: 600; margin: 0;">Verify your email</h1>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px; text-align: center;">
            Enter this code to complete your signup:
          </p>
          
          <div style="background-color: #F5F5F5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1C1C1E;">${code}</span>
          </div>
          
          <p style="font-size: 14px; color: #767676; text-align: center; margin-bottom: 8px;">
            This code expires in 10 minutes.
          </p>
          
          <p style="font-size: 14px; color: #767676; text-align: center;">
            If you didn't request this, you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #E6E6E6; margin: 32px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} Medly AI Ltd. All rights reserved.
          </p>
        </div>
      `,
      });

      if (emailError) {
        console.error("Failed to send verification email:", emailError);
        return NextResponse.json(
          { error: "email_send_failed" },
          { status: 500 }
        );
      }
    }

    // Always return token and requires_verification flag
    return NextResponse.json({
      requires_verification: verificationRequired,
      verification_token: token,
      expires_in_seconds: expiresInSeconds,
    });
  } catch (error) {
    console.error("Error in signup/start:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
