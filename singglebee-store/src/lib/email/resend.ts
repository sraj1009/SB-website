import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key_for_build");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const SENDER_EMAIL = "onboarding@resend.dev"; // Replace with your verified domain email in production

export async function sendVerificationEmail(email: string, token: string) {
    const confirmLink = `${APP_URL}/api/auth/verify?token=${token}`;

    try {
        await resend.emails.send({
            from: `SinggleBee <${SENDER_EMAIL}>`,
            to: email,
            subject: "Verify your email address - SinggleBee",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to SinggleBee!</h2>
          <p>Please click the button below to verify your email address and activate your account.</p>
          <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">
            Verify Email
          </a>
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            If you didn't create an account, you can safely ignore this email. This link will expire in 1 hour.
          </p>
        </div>
      `,
        });
    } catch (error) {
        console.error("Failed to send verification email:", error);
    }
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    try {
        await resend.emails.send({
            from: `SinggleBee Support <${SENDER_EMAIL}>`,
            to: email,
            subject: "Reset your password - SinggleBee",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset the password for your SinggleBee account.</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">
            Reset Password
          </a>
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour.
          </p>
        </div>
      `,
        });
    } catch (error) {
        console.error("Failed to send password reset email:", error);
    }
}
