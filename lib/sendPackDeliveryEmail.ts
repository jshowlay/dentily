import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/stripe";

export interface SendPackDeliveryEmailOptions {
  toEmail: string;
  /** Stripe Checkout Session id — used to build the verified download link. */
  sessionId: string;
}

/**
 * Sends the post-purchase delivery email with the quick-start guide download
 * link. The link points at /api/download, which re-verifies payment before
 * serving any file, so the URL is safe to email.
 */
export async function sendPackDeliveryEmail({
  toEmail,
  sessionId,
}: SendPackDeliveryEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "Dentily <hello@dentily.co>";
  const baseUrl = getAppBaseUrl().replace(/\/$/, "");
  const downloadUrl = `${baseUrl}/api/download?session_id=${encodeURIComponent(sessionId)}`;
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to: toEmail,
    subject: "Your Dallas Dental Leads are ready — here's your download",
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #0f172a;">
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi there,</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px;">
          Your Dallas Dental Leads Pack is ready. Click below to download your quick start guide and CSV.
        </p>
        <p style="margin: 0 0 28px;">
          <a href="${downloadUrl}"
             style="display: inline-block; background: #0ea5e9; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 13px 22px; border-radius: 8px;">
            Download Your Pack &rarr;
          </a>
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
          The guide walks you through sorting your leads, filling in your outreach templates, and getting
          your first emails out today.
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
          Questions? Just reply to this email.
        </p>
        <p style="font-size: 14px; color: #0f172a; margin: 0;">&mdash; The Dentily Team</p>
      </div>
    `,
  });
}
