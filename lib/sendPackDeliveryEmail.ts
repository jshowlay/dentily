import { readFile } from "fs/promises";
import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/stripe";

export interface SendPackDeliveryEmailOptions {
  toEmail: string;
  /** Stripe Checkout Session id — used to build the verified download link. */
  sessionId: string;
  /** e.g. "Dallas", "Austin", "Houston" */
  market?: string;
  /** Local filesystem path to the CSV (optional). */
  csvPath?: string;
  /** Remote URL to fetch the CSV from (optional). */
  csvUrl?: string;
  /** Pre-built CSV bytes — used when path/url are unavailable (e.g. generated from DB). */
  csvBuffer?: Buffer;
  /** Attachment filename when csvBuffer is provided. */
  csvFilename?: string;
}

async function loadCsvAttachment(options: {
  csvPath?: string;
  csvUrl?: string;
  csvBuffer?: Buffer;
}): Promise<Buffer | null> {
  if (options.csvBuffer && options.csvBuffer.length > 0) {
    return options.csvBuffer;
  }

  const csvPath = options.csvPath?.trim();
  if (csvPath) {
    try {
      return await readFile(csvPath);
    } catch (err) {
      console.warn("[sendPackDeliveryEmail] could not read csvPath", csvPath, err);
      return null;
    }
  }

  const csvUrl = options.csvUrl?.trim();
  if (csvUrl) {
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) {
        console.warn("[sendPackDeliveryEmail] CSV fetch failed", res.status, csvUrl);
        return null;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.warn("[sendPackDeliveryEmail] could not fetch csvUrl", csvUrl, err);
      return null;
    }
  }

  return null;
}

/**
 * Sends the post-purchase delivery email with the quick-start guide download
 * link. The link points at /api/download, which re-verifies payment before
 * serving any file, so the URL is safe to email.
 */
export async function sendPackDeliveryEmail({
  toEmail,
  sessionId,
  market,
  csvPath,
  csvUrl,
  csvBuffer,
  csvFilename,
}: SendPackDeliveryEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "Dentily <hello@dentily.co>";
  const baseUrl = getAppBaseUrl().replace(/\/$/, "");
  const downloadUrl = `${baseUrl}/api/download?session_id=${encodeURIComponent(sessionId)}`;
  const resend = new Resend(apiKey);
  const marketLabel = market?.trim() || "your market";
  const subject = `Your ${marketLabel} dental leads pack from Dentily`;

  const attachmentBuffer = await loadCsvAttachment({ csvPath, csvUrl, csvBuffer });
  if (!attachmentBuffer && (csvPath || csvUrl || csvBuffer)) {
    console.warn("[sendPackDeliveryEmail] sending without CSV attachment", { sessionId });
  }

  const filename = csvFilename?.trim() || "dental-leads.csv";
  const csvAttachedLine = attachmentBuffer
    ? "Your leads CSV is attached to this email for instant access."
    : null;

  await resend.emails.send({
    from,
    to: toEmail,
    subject,
    text: [
      "Hi there,",
      "",
      `Your ${marketLabel} Dental Leads Pack is ready.`,
      "",
      ...(csvAttachedLine ? [csvAttachedLine, ""] : []),
      `Access your pack here: ${downloadUrl}`,
      "",
      "The guide walks you through sorting your leads, filling in your outreach templates, and getting your first emails out today.",
      "",
      "Questions? Just reply to this email.",
      "",
      "— The Dentily Team",
      "dentily.co",
    ].join("\n"),
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #0f172a;">
        <p style="font-size: 13px; color: #64748b; margin: 0 0 24px;">From the Dentily Team · dentily.co</p>
        <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hi there,</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px;">
          Your ${marketLabel} Dental Leads Pack is ready. Click below to access your quick start guide and leads.
        </p>
        ${
          csvAttachedLine
            ? `<p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px;">${csvAttachedLine}</p>`
            : ""
        }
        <p style="margin: 0 0 28px;">
          <a href="${downloadUrl}"
             style="display: inline-block; background: #0ea5e9; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 13px 22px; border-radius: 8px;">
            Access Your Pack &rarr;
          </a>
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px;">
          The guide walks you through sorting your leads, filling in your outreach templates, and getting your first emails out today.
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 32px;">
          Questions? Just reply to this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 24px;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Dentily · dentily.co<br/>
          You received this because you purchased a leads pack from Dentily.
        </p>
      </div>
    `,
    attachments: attachmentBuffer ? [{ filename, content: attachmentBuffer }] : [],
  });
}
