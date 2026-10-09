import { Resend } from "resend";
import { stringify } from "csv-stringify/sync";
import { buildLeadPackCsv, type LeadPackCsvRow } from "@/lib/lead-pack-export";
import { toSlugPart } from "@/lib/csv";

export interface SendEnrichedCsvOptions {
  toEmail: string;
  /** Rows with CSV column headers as keys, or LeadPackCsvRow[]. */
  leads: Record<string, unknown>[] | LeadPackCsvRow[];
  location: string;
  orderId: string;
}

function toCsvString(leads: Record<string, unknown>[] | LeadPackCsvRow[]): string {
  if (leads.length === 0) return "";
  const first = leads[0] as Record<string, unknown>;
  if ("name" in first && "priority" in first && !("Name" in first)) {
    return buildLeadPackCsv(leads as LeadPackCsvRow[]);
  }
  return stringify(leads, { header: true });
}

export async function sendEnrichedCsv({
  toEmail,
  leads,
  location,
  orderId,
}: SendEnrichedCsvOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "Dentily <hello@dentily.co>";
  const resend = new Resend(apiKey);

  const csv = toCsvString(leads);
  const csvBuffer = Buffer.from(`\uFEFF${csv}`, "utf-8");
  const slug = toSlugPart(location) || "market";
  const filename = `dentily-${slug}-enriched.csv`;
  const count = leads.filter(
    (r) => (r as { name?: string }).name !== "--- HOW TO USE THIS PACK ---"
  ).length;

  await resend.emails.send({
    from,
    to: toEmail,
    subject: `Your enriched dental leads are ready — ${location}`,
    html: `
      <div style="font-family: 'DM Sans', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #0f172a;">
        <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 12px;">Your leads are fully enriched ✓</h1>
        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
          We've finished enriching your <strong>${location}</strong> dental leads.
          Your CSV now includes predicted emails, contact form URLs, outreach timing signals,
          neighbourhood intelligence, and Apollo search instructions for every practice.
        </p>
        <p style="font-size: 14px; color: #64748b; margin: 0 0 32px;">
          ${count} leads enriched · Order <code style="background:#f1f5f9; padding: 2px 6px; border-radius: 4px;">${orderId}</code>
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 32px;">
          <p style="font-size: 13px; font-weight: 600; color: #0f172a; margin: 0 0 8px;">What's been added:</p>
          <ul style="font-size: 13px; color: #475569; margin: 0; padding-left: 18px; line-height: 1.8;">
            <li>Predicted email + alternative patterns</li>
            <li>Contact form URL per practice</li>
            <li>Why Now — timing signal per lead</li>
            <li>Cluster Notes — neighbourhood market context</li>
            <li>Enrichment Notes — practice intelligence</li>
            <li>Apollo Enrichment — exact search instructions</li>
          </ul>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">
          The enriched CSV is attached to this email.
          Remember to replace {{your_name}}, {{your_company}}, and {{your_credibility_line}} in the Outreach Draft column before sending.
        </p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: csvBuffer,
      },
    ],
  });
}
