import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";

export const ResendOTPPasswordReset = Email({
  id: "password-reset-otp",
  apiKey: process.env.RESEND_API_KEY,
  // 6-digit code, valid for 20 minutes
  maxAge: 60 * 20,
  async generateVerificationToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      // Resend's free shared sender — no domain verification needed.
      // For production, replace with a verified custom domain sender.
      from: "Appointment Booking <onboarding@resend.dev>",
      to: [email],
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
    if (error) {
      throw new Error(`Failed to send reset email: ${JSON.stringify(error)}`);
    }
  },
});
