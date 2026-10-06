/** Standard closing line for growth / acquisition outreach drafts. */
export const MARCUS_OUTREACH_CTA =
  "Reply 'yes' and I'll send a 2-minute Loom on the first change I'd test. No call required.";

/** High review volume: hiring or specialist referral handoffs, not map growth. */
export const MARCUS_OUTREACH_CTA_HIRING =
  "Reply 'yes' and I'll send a short associate shortlist or specialist referral intros matched to your volume. No call required.";

const LEGACY_CTA_RE =
  /I will send a 2-minute Loom on the first change I would test\. Reply (?:Loom|yes if you want it|send it and I will push it over)\. No call required\.?\s*/gi;

/** Replace legacy rotating CTAs in AI-generated drafts with the standard line. */
export function normalizeOutreachCta(text: string): string {
  let out = text.replace(LEGACY_CTA_RE, "").trim();
  if (
    !out.includes(MARCUS_OUTREACH_CTA) &&
    !out.includes(MARCUS_OUTREACH_CTA_HIRING)
  ) {
    out = `${out}\n\n${MARCUS_OUTREACH_CTA}`;
  }
  return out;
}
