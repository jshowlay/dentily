import { getLeadScoringEvidence } from "@/lib/lead-scoring-evidence";
import { getPackListingLabelFromLead, PACK_LISTING_LABELS } from "@/lib/pack-listing-quality";
import { MARCUS_PERSONA } from "@/lib/lead-pipeline-config";
import {
  MARCUS_OUTREACH_CTA_HIRING,
  OUTREACH_SOFT_QUESTION_CTAS,
  pickOutreachCtaIndex,
} from "@/lib/outreach-cta";
import type { Lead } from "@/lib/types";
import { formatMarketLocation } from "@/lib/format-market-location";
import { hasDuplicateFiveWordSpan, hashString, stripLongDashes } from "@/lib/outreach-text";

export type OutreachDraftOptions = {
  /** Search market city (e.g. Boise) — never a street address. */
  marketCity?: string | null;
  /** Avoid repeating the same CTA as the prior row in a pack. */
  avoidCtaIndex?: number;
  /** Set by {@link buildOutreachDraft} for sequential rotation. */
  ctaIndexOut?: { value: number };
};

export type OutreachDraftStyle =
  | "reputation_gap"
  | "low_review_volume"
  | "no_website"
  | "no_online_booking"
  | "multi_office"
  | "high_volume_saturation"
  | "general";

function scrubBanned(s: string): string {
  return s.replace(MARCUS_PERSONA.bannedWords, "");
}

function signOffBlock(): string {
  return `\n\n\u2014 {{your_name}}`;
}

function placeholderIntro(): string {
  return `{{your_name}} here, from {{your_company}}. {{your_credibility_line}}`;
}

export function marketLabel(opts?: OutreachDraftOptions): string {
  const c = opts?.marketCity?.trim();
  if (!c || c.length < 2) return "your market";
  const formatted = formatMarketLocation(c);
  if (formatted) return formatted.split(",")[0]?.trim() || formatted;
  const token = c.split(",")[0]?.trim() ?? c;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function roundNatural(n: number): string {
  if (!Number.isFinite(n)) return "about 0";
  if (n >= 1000) return `around ${Math.round(n / 100) * 100}`;
  if (n >= 100) return `around ${Math.round(n / 50) * 50}`;
  if (n >= 20) return `about ${Math.round(n / 10) * 10}`;
  return `about ${Math.round(n)}`;
}

function formatRating(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function practiceShortName(name: string): string {
  return name.trim() || "your practice";
}

function peerGroupPhrase(lead: Lead, city: string): string {
  const n = (lead.name ?? "").toLowerCase();
  if (/\borthodont/.test(n)) return `${city} orthodontists`;
  if (/\b(endodont|periodont)/.test(n)) return `${city} specialists`;
  if (/\b(pediatric|kids|children)/.test(n)) return `${city} pediatric dentists`;
  return `${city} practices`;
}

function peerGroupNearby(city: string): string {
  return `practices nearby in ${city}`;
}

function isMultiOfficeLead(lead: Lead, marketCity?: string | null): boolean {
  const label = getPackListingLabelFromLead(lead);
  if (label === PACK_LISTING_LABELS.multiOffice) return true;
  if (lead.metadata?.multiLocationGroup === true) return true;
  const name = (lead.name ?? "").toLowerCase();
  const city = (marketCity ?? "").split(",")[0]?.trim().toLowerCase();
  if (city && name.includes(city) && /\b(endodontics|orthodontics|periodontics)\b/.test(name)) {
    return true;
  }
  return false;
}

function medianRatingFromEvidence(lead: Lead): number | null {
  const ev = getLeadScoringEvidence(lead);
  if (ev?.marketMedianRating != null) return ev.marketMedianRating;
  const m = ev?.ratingVsMarket?.match(/vs\. a ([\d.]+)/i);
  return m ? Number(m[1]) : null;
}

function medianReviewsFromEvidence(lead: Lead): number | null {
  const ev = getLeadScoringEvidence(lead);
  if (ev?.marketMedianReviewCount != null) return ev.marketMedianReviewCount;
  const m = ev?.reviewsVsMarket?.match(/vs\. a ([\d]+)/i);
  return m ? Number(m[1]) : null;
}

export function classifyOutreachDraftStyle(
  lead: Lead,
  opts?: OutreachDraftOptions
): OutreachDraftStyle {
  const ev = getLeadScoringEvidence(lead);
  const rc = lead.reviewCount ?? 0;
  const rating = lead.rating ?? 0;

  if (isMultiOfficeLead(lead, opts?.marketCity)) return "multi_office";
  if (!(lead.website ?? "").trim()) return "no_website";
  if (ev?.website?.hasOnlineBooking === false) return "no_online_booking";
  if (ev?.ratingVsMarket) return "reputation_gap";
  if (ev?.reviewsVsMarket) return "low_review_volume";
  if (rc >= 900 && rating >= 4.8) return "high_volume_saturation";
  return "general";
}

function pickCta(style: OutreachDraftStyle, seed: number, avoid?: number): { text: string; index: number } {
  if (style === "high_volume_saturation") {
    return { text: MARCUS_OUTREACH_CTA_HIRING, index: -1 };
  }
  const index = pickOutreachCtaIndex(seed, avoid);
  return { text: OUTREACH_SOFT_QUESTION_CTAS[index]!, index };
}

function buildHumanBody(lead: Lead, style: OutreachDraftStyle, city: string, cta: string): string {
  const name = practiceShortName(lead.name ?? "");
  const rating = lead.rating != null ? formatRating(Number(lead.rating)) : null;
  const rc = lead.reviewCount != null ? Number(lead.reviewCount) : null;
  const medRating = medianRatingFromEvidence(lead);
  const medReviews = medianReviewsFromEvidence(lead);
  const peers = peerGroupPhrase(lead, city);

  switch (style) {
    case "reputation_gap": {
      const med = medRating != null ? formatRating(medRating) : "4.8";
      const r = rating ?? "4.0";
      return `I was looking at dental practices in ${city} and noticed ${name} sits at ${r} stars on Google, while most ${peers} are around ${med}. For a lot of patients, that's enough to scroll past. ${cta}`;
    }
    case "no_website": {
      const audience = /\b(pediatric|kids|children)/i.test(name) ? "Parents" : "People";
      return `I was looking at practices in ${city} and couldn't find a website for ${name}, just the Google Maps listing. ${audience} searching in ${city} usually want to see a site before they call. ${cta}`;
    }
    case "low_review_volume": {
      const count = rc ?? 0;
      const med = medReviews != null ? roundNatural(medReviews) : `around 200`;
      return `I was comparing ${peers} and ${name} shows ${count} Google reviews, while most ${peers} have ${med}. That gap shows up fast when someone is picking a dentist. ${cta}`;
    }
    case "no_online_booking":
      return `I was on ${name}'s homepage and didn't spot a way to book online from the homepage. In ${city}, that extra step is often where people drop off. ${cta}`;
    case "multi_office": {
      const count = rc ?? 0;
      const med = medReviews != null ? roundNatural(medReviews) : "about 100";
      return `I was looking at ${peers} and your ${city} office shows ${count} reviews, while most ${peers} have ${med}. When you have more than one location, each pin needs to stand on its own. ${cta}`;
    }
    case "high_volume_saturation": {
      const count = rc ?? 0;
      const r = rating ?? "4.9";
      return `${name} already looks well established on Google (${r} stars, ${count} reviews). I won't pitch generic growth, but ${cta}`;
    }
    default: {
      const r = rating ?? "4.5";
      const count = rc ?? 0;
      return `I was looking at ${peerGroupNearby(city)} and ${name} caught my eye (${r} stars, ${count} reviews). ${cta}`;
    }
  }
}

function trimToMaxWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  let truncated = words.slice(0, maxWords).join(" ");
  const lastStop = Math.max(truncated.lastIndexOf("."), truncated.lastIndexOf("?"));
  if (lastStop > truncated.length * 0.55) {
    return truncated.slice(0, lastStop + 1).trim();
  }
  return `${truncated.replace(/[,;—-]+$/, "")}.`;
}

export function buildOutreachSubjectLine(lead: Lead, opts?: OutreachDraftOptions): string {
  const city = marketLabel(opts);
  const style = classifyOutreachDraftStyle(lead, opts);
  const name = practiceShortName(lead.name ?? "");
  const shortName = name.length > 42 ? `${name.slice(0, 39)}…` : name;

  switch (style) {
    case "reputation_gap":
      return `Your Google rating in ${city}`;
    case "low_review_volume":
      return `${shortName} — reviews vs. other ${city} dentists`;
    case "no_website":
      return `Website for ${shortName}?`;
    case "no_online_booking":
      return `Online booking on ${shortName}'s site`;
    case "multi_office":
      return `${shortName} (${city} office)`;
    case "high_volume_saturation":
      return `${shortName} — hiring or referrals?`;
    default:
      return `Quick thought on ${shortName}`;
  }
}

export function buildOutreachDraft(lead: Lead, opts?: OutreachDraftOptions): string {
  const nameKey = (lead.name ?? "").toLowerCase().trim();
  const style = classifyOutreachDraftStyle(lead, opts);
  const ctaSeed = hashString(`${nameKey}|${style}|cta`);
  const city = marketLabel(opts);
  const { text: cta, index: ctaIndex } = pickCta(style, ctaSeed, opts?.avoidCtaIndex);
  if (opts?.ctaIndexOut) opts.ctaIndexOut.value = ctaIndex;

  const intro = scrubBanned(placeholderIntro());
  const headerWords = 1 + intro.split(/\s+/).filter(Boolean).length;
  const maxBodyWords = Math.max(35, 88 - headerWords);
  let body = scrubBanned(stripLongDashes(buildHumanBody(lead, style, city, cta)));
  body = trimToMaxWords(body, maxBodyWords);
  let core = `Hi,\n\n${intro}\n\n${body}`;
  if (hasDuplicateFiveWordSpan(core)) {
    body = trimToMaxWords(
      scrubBanned(buildHumanBody(lead, style, city, OUTREACH_SOFT_QUESTION_CTAS[0]!)),
      maxBodyWords
    );
    core = `Hi,\n\n${intro}\n\n${body}`;
  }
  return `${core}${signOffBlock()}`.slice(0, 2000);
}

/** Regenerate drafts for a sorted pack; rotates CTAs so no two consecutive rows share one. */
export function buildOutreachDraftsForLeads(
  leads: Lead[],
  marketCity: string | null | undefined
): Map<string, string> {
  const out = new Map<string, string>();
  let lastCta = -1;
  for (const lead of leads) {
    const ctaOut = { value: -1 };
    const draft = buildOutreachDraft(lead, {
      marketCity,
      avoidCtaIndex: lastCta >= 0 ? lastCta : undefined,
      ctaIndexOut: ctaOut,
    });
    if (ctaOut.value >= 0) lastCta = ctaOut.value;
    out.set(lead.placeId ?? lead.name, draft);
  }
  return out;
}

/** @deprecated Tests — use {@link buildHumanBody} paths via buildOutreachDraft. */
export function primaryObservationForOutreach(lead: Lead, opts?: OutreachDraftOptions): string {
  const style = classifyOutreachDraftStyle(lead, opts);
  const city = marketLabel(opts);
  const body = buildHumanBody(lead, style, city, "");
  return body.replace(/^Hi,?\s*/i, "").trim();
}
