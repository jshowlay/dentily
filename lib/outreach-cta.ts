/** @deprecated Legacy growth CTA — prefer {@link OUTREACH_SOFT_QUESTION_CTAS} in new drafts. */
export const MARCUS_OUTREACH_CTA =
  "Reply 'yes' and I'll send a 2-minute Loom on the first change I'd test. No call required.";

/** High review volume: hiring or specialist referral handoffs, not map growth. */
export const MARCUS_OUTREACH_CTA_HIRING =
  "Would it be useful if I sent a couple of associate names or referral partners other high-volume offices use?";

/** Rotating soft-question closes — natural voice, no product jargon. */
export const OUTREACH_SOFT_QUESTION_CTAS = [
  "Would a couple of ideas on closing that gap be useful?",
  "Want me to send a quick idea of what I'd put there first?",
  "Open to a short note on the first change I'd try?",
  "Would it help if I shared two things I'd test first?",
  "Want me to send over a couple of ideas?",
  "Could I send a few sentences on what I'd fix first?",
  "Happy to share a quick take — would that be useful?",
] as const;

const LEGACY_CTA_RE =
  /I will send a 2-minute Loom on the first change I would test\. Reply (?:Loom|yes if you want it|send it and I will push it over)\. No call required\.?\s*/gi;

/** Replace legacy rotating CTAs in AI-generated drafts with a standard soft question when missing. */
export function normalizeOutreachCta(text: string): string {
  let out = text.replace(LEGACY_CTA_RE, "").trim();
  const hasSoftClose = OUTREACH_SOFT_QUESTION_CTAS.some((c) => out.includes(c));
  if (
    !hasSoftClose &&
    !out.includes(MARCUS_OUTREACH_CTA) &&
    !out.includes(MARCUS_OUTREACH_CTA_HIRING)
  ) {
    out = `${out}\n\n${OUTREACH_SOFT_QUESTION_CTAS[0]}`;
  }
  return out;
}

export function pickOutreachCtaIndex(seed: number, avoidIndex?: number): number {
  const n = OUTREACH_SOFT_QUESTION_CTAS.length;
  let idx = ((seed % n) + n) % n;
  if (avoidIndex != null && avoidIndex >= 0 && idx === avoidIndex) {
    idx = (idx + 1) % n;
  }
  return idx;
}
