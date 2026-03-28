import type { Lead } from "@/lib/types";

/**
 * When rating and review count exist, ensure outreach references them (data-aware openers).
 * Caller should run keyword validation (patients / appointments) after this.
 */
export function personalizeDentistOutreachWithSignals(lead: Lead, outreach: string): string {
  const r = lead.rating;
  const rc = lead.reviewCount;
  if (r == null || rc == null) {
    return outreach;
  }
  const ratingStr = String(r);
  const rcStr = String(rc);
  const mentionsRating =
    outreach.includes(ratingStr) || /\b\d+(\.\d+)?\s*(star|rating)\b/i.test(outreach);
  const mentionsReviews = outreach.includes(rcStr) || /\b\d+\s+reviews?\b/i.test(outreach);
  if (mentionsRating && mentionsReviews) {
    return outreach;
  }

  const hook = `Hi — I noticed your practice has a ${ratingStr} rating with around ${rc} reviews. `;
  const stripped = outreach.replace(/^\s*Hi\s*[—–-]\s*/i, "").trim();
  const tail =
    stripped.length > 0
      ? stripped
      : "We help dentists turn that into more booked appointments — open to a quick idea?";
  let combined = hook + tail;
  if (combined.length > 280) {
    combined = `${combined.slice(0, 277)}...`;
  }
  return combined;
}
