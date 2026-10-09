import { getLeadScoringEvidence } from "@/lib/lead-scoring-evidence";
import type { Lead } from "@/lib/types";

type ReasonBuilder = (lead: Lead) => string;

function opp(lead: Lead): string {
  return (lead.opportunityType ?? "").toLowerCase();
}

const NO_WEBSITE: ReasonBuilder[] = [
  () => "no website on the Google listing, so patients searching online have nowhere to land",
  () => "missing a standalone site, so searchers often click through to a competitor instead",
  () => "no owned website on the listing, so paid and organic traffic has no home base",
];

const REPUTATION_GAP: ReasonBuilder[] = [
  (l) =>
    `${l.rating}-star average across ${l.reviewCount} Google reviews, so choosy patients may pick higher-rated offices nearby`,
  (l) =>
    `${l.reviewCount} reviews at ${l.rating} stars — below the 4.5 filter many people use when comparing practices`,
  (l) =>
    `public rating is ${l.rating} with ${l.reviewCount} reviews, so reputation work could unlock more high-intent calls`,
];

const NEWER: ReasonBuilder[] = [
  (l) =>
    `only ${l.reviewCount} Google reviews so far, so the listing still looks thin next to established competitors`,
  (l) =>
    `${l.reviewCount} reviews on Maps — early-stage proof that visibility and review velocity could move the needle`,
  (l) =>
    `still at ${l.reviewCount} public reviews, so a focused reputation push could close the gap with nearby offices`,
];

const ESTABLISHED: ReasonBuilder[] = [
  (l) =>
    `${l.rating} stars and ${l.reviewCount} reviews with little visible growth push, so paid acquisition could still add patients`,
  (l) =>
    `solid ${l.rating}-star profile (${l.reviewCount} reviews) but quiet marketing motion — room for ads or conversion work`,
  (l) =>
    `${l.reviewCount} reviews at ${l.rating} stars; profile looks mature but not actively scaling new patient flow`,
];

const SATURATION: ReasonBuilder[] = [
  (l) =>
    `${l.reviewCount} public reviews already — skip a growth pitch and lean hiring or referral angles instead`,
  (l) =>
    `Maps dominance (${l.reviewCount} reviews) — partnership or recruiting angles beat another generic growth offer`,
];

const GENERAL: ReasonBuilder[] = [
  (l) =>
    `${l.rating}-star rating with ${l.reviewCount} reviews — room to turn local visibility into more booked patients`,
  (l) =>
    `${l.reviewCount} reviews at ${l.rating} stars; local presence is there but could convert more searchers into bookings`,
  (l) =>
    `about ${l.reviewCount} Google reviews at ${l.rating} stars — opportunity to sharpen how the listing converts`,
];

function evidenceReason(lead: Lead): string | null {
  const gaps = getLeadScoringEvidence(lead)?.gaps ?? [];
  if (!gaps.length) return null;
  const first = gaps[0]!.replace(/\.$/, "");
  return first.charAt(0).toLowerCase() + first.slice(1);
}

function pickPool(lead: Lead): ReasonBuilder[] {
  const fromEvidence = evidenceReason(lead);
  if (fromEvidence) {
    return [() => fromEvidence];
  }
  const hasSite = Boolean(lead.website?.trim());
  const o = opp(lead);
  if (!hasSite || o === "no_website") return NO_WEBSITE;
  if (o === "reputation_gap" && lead.rating != null && lead.reviewCount != null) return REPUTATION_GAP;
  if (o === "newer_unknown" && lead.reviewCount != null) return NEWER;
  if (o === "established_static" && lead.rating != null && lead.reviewCount != null) return ESTABLISHED;
  if (o === "high_volume_saturation" && lead.reviewCount != null) return SATURATION;
  if (lead.rating != null && lead.reviewCount != null) return GENERAL;
  return [
    (l) =>
      l.reviewCount != null
        ? `${l.reviewCount} Google reviews on file — scored as a strong independent in this market`
        : "scored as a strong independent target in this market",
  ];
}

/** Assign a unique reason phrase per lead when possible (for email bullets). */
export function buildDistinctAdminSampleEmailReasons(leads: Lead[]): string[] {
  const used = new Set<string>();
  const out: string[] = [];

  for (let i = 0; i < leads.length; i += 1) {
    const lead = leads[i]!;
    const pool = pickPool(lead);
    let chosen = pool[i % pool.length]!(lead);
    if (used.has(chosen)) {
      for (let j = 0; j < pool.length; j += 1) {
        const alt = pool[(i + j) % pool.length]!(lead);
        if (!used.has(alt)) {
          chosen = alt;
          break;
        }
      }
    }
    used.add(chosen);
    out.push(chosen);
  }

  return out;
}

export function buildAdminSampleEmailReason(lead: Lead, index = 0, used?: Set<string>): string {
  const pool = pickPool(lead);
  const usedSet = used ?? new Set<string>();
  for (let j = 0; j < pool.length; j += 1) {
    const candidate = pool[(index + j) % pool.length]!(lead);
    if (!usedSet.has(candidate)) {
      usedSet.add(candidate);
      return candidate;
    }
  }
  return pool[0]!(lead);
}
