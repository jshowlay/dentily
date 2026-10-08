import { Resend } from "resend";
import type { PreviewCaptureRow, PreviewLeadSnapshot } from "@/lib/preview-capture-types";
import { getAppBaseUrl } from "@/lib/stripe";

export type PreviewSequenceEmailNumber = 1 | 2 | 3;

function previewReplyTo(): string {
  return process.env.PREVIEW_SEQUENCE_REPLY_TO?.trim() || "hello@dentily.co";
}

function unlockUrl(searchId: string | null): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  if (searchId) {
    return `${base}/results?searchId=${encodeURIComponent(searchId)}`;
  }
  return `${base}/search`;
}

function unsubscribeUrl(token: string): string {
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

function canSpamFooter(unsubscribeLink: string): string {
  return [
    "",
    `Unsubscribe: ${unsubscribeLink}`,
    "",
    "You're receiving this because you requested a market preview at dentily.co · dentily.co",
  ].join("\n");
}

function leadBlock(index: number, lead: PreviewLeadSnapshot): string {
  return [
    `${index}. ${lead.name}: score ${lead.score} (${lead.signal})`,
    `   ${lead.why}`,
  ].join("\n");
}

function buildEmail1(row: PreviewCaptureRow, unlock: string, unsub: string): { subject: string; text: string } {
  const market = row.market;
  const leads = row.previewSnapshot;
  const blocks: string[] = [];
  for (let i = 0; i < leads.length; i += 1) {
    blocks.push(leadBlock(i + 1, leads[i]!));
  }
  const subject = `Your ${market} dental preview`;
  const text = [
    "Hi,",
    "",
    `Here's the preview you ran on Dentily for ${market}.`,
    "",
    "Top 3 practices from your search:",
    "",
    ...blocks,
    "",
    `Your full pack has ${row.leadCount} scored practices from this search, each with a contact path and an outreach draft written for that practice.`,
    "",
    `Unlock all ${row.leadCount} for $99: ${unlock}`,
    "",
    "Pamela",
    "Founder, Dentily",
    canSpamFooter(unsub),
  ].join("\n");
  return { subject, text };
}

function buildEmail2(row: PreviewCaptureRow, unlock: string, unsub: string): { subject: string; text: string } {
  const market = row.market;
  const lead1 = row.previewSnapshot[0];
  const remaining = Math.max(0, row.leadCount - 1);
  const subject = `One ${market} practice I'd call first`;
  const text = [
    "Hi,",
    "",
    `If I were prospecting ${market} this week, I'd start with ${lead1?.name ?? "your top lead"}.`,
    "",
    lead1 ? `Score: ${lead1.score}` : "",
    lead1 ? `Signal: ${lead1.signal}` : "",
    lead1 ? `Why: ${lead1.why}` : "",
    "",
    lead1?.pitchExcerpt
      ? [`Here's how Dentily's outreach draft opens for them:`, `"${lead1.pitchExcerpt}"`, ""].join("\n")
      : "",
    `There are ${remaining} more like this in your pack: ${unlock}`,
    "",
    "Pamela",
    canSpamFooter(unsub),
  ]
    .filter((line) => line !== "")
    .join("\n");
  return { subject, text };
}

function buildEmail3(row: PreviewCaptureRow, unlock: string, unsub: string): { subject: string; text: string } {
  const market = row.market;
  const subject = `Closing out your ${market} preview`;
  const text = [
    "Hi,",
    "",
    `Last note on this. Your ${market} preview is still saved. If dental outreach is on your list this month, the full pack is $99, one-time, and you can start reaching out the same day.`,
    "",
    unlock,
    "",
    "If the timing's off, no worries. Just reply and tell me what would make Dentily more useful. I read every reply.",
    "",
    "Pamela",
    canSpamFooter(unsub),
  ].join("\n");
  return { subject, text };
}

export async function sendPreviewSequenceEmail(
  row: PreviewCaptureRow,
  which: PreviewSequenceEmailNumber
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "Dentily <hello@dentily.co>";
  const unlock = unlockUrl(row.searchId);
  const unsub = unsubscribeUrl(row.unsubscribeToken);

  const built =
    which === 1
      ? buildEmail1(row, unlock, unsub)
      : which === 2
        ? buildEmail2(row, unlock, unsub)
        : buildEmail3(row, unlock, unsub);

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: row.email,
    replyTo: previewReplyTo(),
    subject: built.subject,
    text: built.text,
    headers: {
      "List-Unsubscribe": `<${unsub}>, <mailto:hello@dentily.co?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
