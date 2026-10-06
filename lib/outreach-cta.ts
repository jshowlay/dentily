/** Standard closing line for all Marcus / pack outreach drafts. */
export const MARCUS_OUTREACH_CTA =
  "Reply 'yes' and I'll send a 2-minute Loom on the first change I'd test. No call required.";

const LEGACY_CTA_RE =
  /I will send a 2-minute Loom on the first change I would test\. Reply (?:Loom|yes if you want it|send it and I will push it over)\. No call required\.?\s*/gi;

/** Replace legacy rotating CTAs in AI-generated drafts with the standard line. */
export function normalizeOutreachCta(text: string): string {
  let out = text.replace(LEGACY_CTA_RE, "").trim();
  if (!out.includes(MARCUS_OUTREACH_CTA)) {
    out = `${out}\n\n${MARCUS_OUTREACH_CTA}`;
  }
  return out;
}
