import { MIN_REVIEWS_FOR_RATING_SIGNALS } from "@/lib/lead-quality-filters";
import { MARCUS_PERSONA, REPUTATION_GAP_RATING_BELOW, REVIEW_SATURATION } from "@/lib/lead-pipeline-config";
import {
  MARCUS_OUTREACH_CTA,
  MARCUS_OUTREACH_CTA_HIRING,
  normalizeOutreachCta,
} from "@/lib/outreach-cta";
import { parseCityFromAddress } from "@/lib/parse-city-from-address";
import { getLeadScoringEvidence } from "@/lib/lead-scoring-evidence";
import type { Lead } from "@/lib/types";
import { buildOutreachDraft, type OutreachDraftOptions } from "@/lib/outreach-draft";
import { dedupeSentencesInOutreach, hasDuplicateFiveWordSpan, hashString, stripLongDashes } from "@/lib/outreach-text";

export { MARCUS_OUTREACH_CTA };

export type OutreachArchetype =
  | "reputation_gap"
  | "established_static"
  | "high_volume_saturation"
  | "newer_unknown"
  | "general";

export { hashString };

function establishedStaticEvidence(lead: Pick<Lead, "metadata">): boolean {
  const ev = getLeadScoringEvidence(lead);
  if (!ev?.gaps.length) return false;
  return (
    ev.noReviewIn90Days ||
    Boolean(ev.ratingVsMarket) ||
    Boolean(ev.reviewsVsMarket) ||
    ev.website?.slowMobile === true ||
    ev.website?.httpsOk === false ||
    ev.website?.hasOnlineBooking === false ||
    ev.website?.staleCopyright === true
  );
}

export function classifyOutreachArchetype(
  lead: Pick<Lead, "rating" | "reviewCount" | "website" | "metadata">
): OutreachArchetype {
  const r = lead.rating;
  const rc = lead.reviewCount;
  const rating = r !== null && r !== undefined && Number.isFinite(Number(r)) ? Number(r) : null;
  const reviews = rc !== null && rc !== undefined && Number.isFinite(Number(rc)) ? Number(rc) : null;

  if (rating !== null && reviews !== null && reviews >= REVIEW_SATURATION && rating >= 4.8) {
    return "high_volume_saturation";
  }
  if (
    rating !== null &&
    reviews !== null &&
    reviews >= MIN_REVIEWS_FOR_RATING_SIGNALS &&
    rating < REPUTATION_GAP_RATING_BELOW
  ) {
    return "reputation_gap";
  }
  if (reviews !== null && reviews < 100) {
    return "newer_unknown";
  }
  if (
    rating !== null &&
    reviews !== null &&
    rating >= 4.7 &&
    reviews >= 200 &&
    reviews <= 800 &&
    establishedStaticEvidence(lead)
  ) {
    return "established_static";
  }
  return "general";
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

function scrubBanned(s: string): string {
  return s.replace(MARCUS_PERSONA.bannedWords, "");
}

/** Buyer replaces before send — keep literal em dash before placeholder per product spec. */
function signOffBlock(): string {
  return `\n\n\u2014 {{your_name}}`;
}

function introBlock(): string {
  return `{{your_name}} here, from {{your_company}}. {{your_credibility_line}}`;
}

/** 15-second voicemail when phone is the only practical path (buyer placeholders). */
export function buildVoicemailScript(lead: Pick<Lead, "name">): string {
  const name = (lead.name ?? "there").trim();
  return scrubBanned(
    `Hi ${name}, this is {{your_name}} from {{your_company}}. I work with a handful of dental practices on new patient acquisition. If you have thirty seconds, I had one specific observation about how you show up locally. Callback is fine whenever works. Thanks.`
  );
}

function reputationBodies(geo: string, ratingStr: string, rcStr: string): readonly string[] {
  return [
    `Your public rating is about ${ratingStr} stars. ${geo} that often falls below the 4.5+ filter patients use on Google Maps.`,
    `Google shows about ${ratingStr} stars with roughly ${rcStr} reviews. ${geo} that number is often the first cut when someone compares practices on the list.`,
    `The listing reads about ${ratingStr} stars across roughly ${rcStr} reviews. ${geo} does that star line show up in search before your narrative does?`,
    `Maps lists about ${ratingStr} stars from roughly ${rcStr} public reviews. ${geo} is that line stable for you or still moving week to week?`,
    `Public average is about ${ratingStr} stars with roughly ${rcStr} reviews. ${geo} how often do you think that headline number costs a click?`,
  ] as const;
}

function establishedBodies(
  cityPhrase: string,
  ratingStr: string,
  rcStr: string,
  hasSite: boolean
): readonly string[] {
  if (hasSite) {
    return [
      `Quick question. Your Maps listing${cityPhrase} shows about ${ratingStr} stars from roughly ${rcStr} reviews, and the public fields include a website URL. When someone opens the profile, is that star line what they cite first?`,
      `Maps lists about ${ratingStr} stars and roughly ${rcStr} reviews${cityPhrase} with a site link on the profile. Does inbound still skew through the map entry versus typed search for you?`,
      `The public profile${cityPhrase} reads about ${ratingStr} stars across roughly ${rcStr} reviews and lists a website. Has that profile stayed flat for you lately or are you still adding reviews steadily?`,
      `I am looking at about ${ratingStr} stars from roughly ${rcStr} reviews${cityPhrase} with a URL in the listing. Does that star line still match what you hear from new patients?`,
      `Google shows roughly ${rcStr} reviews at about ${ratingStr} stars${cityPhrase} plus a website field. Does that snapshot line up with how busy the phones have felt lately?`,
    ] as const;
  }
  return [
    `Your listing${cityPhrase} shows about ${ratingStr} stars from roughly ${rcStr} reviews. The public fields I see do not show a separate website URL. Does most inbound still route through maps and phone?`,
    `Maps lists about ${ratingStr} stars and roughly ${rcStr} reviews${cityPhrase} without a standalone site URL in the listing. Is the map pack still doing most of the discovery work for you?`,
    `The profile${cityPhrase} reads about ${ratingStr} stars across roughly ${rcStr} reviews and no clear primary site link. When you look at weekly demand, does that match what you expect from the listing alone?`,
    `Public data${cityPhrase} shows roughly ${rcStr} reviews at about ${ratingStr} stars and no website URL on the card I can see. Are new bookings still coming mostly from maps and referrals?`,
    `Google shows about ${ratingStr} stars from roughly ${rcStr} reviews${cityPhrase} and I do not see a site URL in the public fields. How much of new patient flow still depends on the map entry versus other channels?`,
  ] as const;
}

function highVolumeBodies(ratingStr: string, rcStr: string): readonly string[] {
  return [
    `Your Maps profile shows about ${rcStr} reviews at roughly ${ratingStr} stars. If you are hiring an associate or hygienist this quarter, I can send two screened candidates who fit that volume.`,
    `With roughly ${rcStr} public reviews at about ${ratingStr} stars, the calendar is usually the constraint. I help with associate hiring handoffs or specialist referral intros when cases need another chair.`,
    `The listing reads about ${rcStr} reviews averaging roughly ${ratingStr} stars. Are you actively recruiting an associate, or looking for endodontic or ortho referral routing you trust?`,
    `Maps shows about ${rcStr} reviews at roughly ${ratingStr} stars. I keep a short associate pipeline and a shortlist of specialists for practices that are already booked solid.`,
    `Roughly ${rcStr} reviews at about ${ratingStr} stars on the profile. If hiring or trusted specialist referrals is the next bottleneck, I can share the shortlists I use for similar volume.`,
  ] as const;
}

function newerUnknownBodies(cityPhrase: string, rcStr: string, hasSite: boolean): readonly string[] {
  if (hasSite) {
    return [
      `Public review count is still light at roughly ${rcStr}${cityPhrase}. The listing includes a website URL, but the review total is below what many nearby general practices show on Maps.`,
      `Maps shows about ${rcStr} reviews so far${cityPhrase} and a site link on the profile. Does booking still lean on referrals and word of mouth more than that review number?`,
      `The listing${cityPhrase} lists roughly ${rcStr} reviews and a website field. Is the gap you feel more about visibility or about trust once people click through?`,
      `Roughly ${rcStr} public reviews${cityPhrase} with a URL in the listing. Does that review total feel like it matches how established you are locally?`,
      `Google lists about ${rcStr} reviews${cityPhrase} plus a website. Are you still in the phase where each new review moves the average, or has it flattened?`,
    ] as const;
  }
  return [
    `Public review count is still light at roughly ${rcStr}${cityPhrase}. The public fields I see do not show a standalone website URL, so maps and phone often carry most of the story.`,
    `Maps shows about ${rcStr} reviews${cityPhrase} and no clear site URL on the card. Does inbound still route through the map entry and calls more than anything else?`,
    `The profile${cityPhrase} reads roughly ${rcStr} reviews with no website URL in the listing. Is trust on the profile still catching up to how busy you are?`,
    `Roughly ${rcStr} reviews${cityPhrase} and no site link in the public fields I can see. When you look at new patients, how often do they mention finding you on Google versus other paths?`,
    `Google lists about ${rcStr} reviews${cityPhrase} without a primary site URL on the listing. Does that line up with how much acquisition work still sits on maps alone?`,
  ] as const;
}

function generalBodies(cityPhrase: string, ratingStr: string, rcStr: string): readonly string[] {
  return [
    `When you look at how you show up${cityPhrase} on Maps, what gap bothers you most between volume and what the listing says?`,
    `I try to ground this in public fields only. About ${ratingStr} stars and roughly ${rcStr} reviews show on the listing${cityPhrase}. What would you change first if you had to pick one lever?`,
    `Maps lists about ${ratingStr} stars from roughly ${rcStr} reviews${cityPhrase}. Is the profile telling the story you want, or is something missing once someone clicks?`,
    `Public average is about ${ratingStr} stars with roughly ${rcStr} reviews${cityPhrase}. Where do you think the listing undersells you today?`,
    `The card${cityPhrase} shows about ${ratingStr} stars and roughly ${rcStr} reviews. If you squint at that snapshot versus your week, what feels off?`,
  ] as const;
}

/**
 * Written-channel draft: buyer placeholders + evidence-led body + soft-question close.
 */
export function buildMarcusWrittenOutreach(lead: Lead, opts?: OutreachDraftOptions): string {
  return buildOutreachDraft(lead, opts);
}

/**
 * Merge AI draft with product rules: strip long dashes in body, dedupe sentences, ensure buyer placeholders present.
 */
export function finalizeMarcusOutreach(lead: Lead, draft: string): string {
  let text = (draft ?? "").trim();
  const placeholderDraft = text.includes("{{your_name}}");
  if (!placeholderDraft) {
    text = stripLongDashes(text);
    text = dedupeSentencesInOutreach(text);
  }
  text = scrubBanned(text);

  const lower = text.toLowerCase();
  const hasPlaceholders =
    lower.includes("{{your_name}}") &&
    lower.includes("{{your_company}}") &&
    lower.includes("{{your_credibility_line}}");

  if (!hasPlaceholders || hasDuplicateFiveWordSpan(text)) {
    return buildMarcusWrittenOutreach(lead);
  }

  text = normalizeOutreachCta(text);

  if (!/\u2014\s*\{\{your_name\}\}/.test(text) && !/-\s*\{\{your_name\}\}/.test(text)) {
    text = `${text}${signOffBlock()}`;
  }

  return text.slice(0, 2000);
}
