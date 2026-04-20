"use node";

import { Email } from "@convex-dev/auth/providers/Email";
import sgMail from "@sendgrid/mail";

// Sender email must be verified in SendGrid (Settings → Sender Authentication).
// For production, replace with an email under your verified custom domain.
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? "justihysi10@gmail.com";
const FROM_NAME = "Appointment Booking";

export const ResendOTPPasswordReset = Email({
  id: "password-reset-otp",
  apiKey: process.env.SENDGRID_API_KEY,
  maxAge: 60 * 20,
  async generateVerificationToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) throw new Error("SENDGRID_API_KEY is not set");

    sgMail.setApiKey(provider.apiKey);

    try {
      await sgMail.send({
        from: { email: FROM_EMAIL, name: FROM_NAME },
        to: email,
        subject: "Reset your password",
        text: `Your password reset code is: ${token}\n\nThis code expires in 20 minutes.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0f172a; margin: 0 0 16px;">Reset your password</h2>
            <p style="color: #475569; line-height: 1.5;">Use this code to reset your password:</p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; text-align: center; margin: 16px 0;">
              <code style="font-size: 32px; letter-spacing: 8px; color: #059669; font-weight: bold;">${token}</code>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">This code expires in 20 minutes. If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? JSON.stringify((err as { response?: { body?: unknown } }).response?.body)
          : String(err);
      throw new Error(`Failed to send reset email: ${detail}`);
    }
  },
});
