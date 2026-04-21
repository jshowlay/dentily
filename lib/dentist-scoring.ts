import type { Lead } from "@/lib/types";
import {
  PRIORITY_SCORE_HIGH_MIN,
  PRIORITY_SCORE_MEDIUM_MIN,
  REVIEW_SATURATION,
  RATING_STRONG,
  SCORING_WEIGHTS,
} from "@/lib/lead-pipeline-config";
import { classifyOutreachArchetype } from "@/lib/marcus-outreach";

/** Optional batch context for name-based heuristics (multi-location / repeated brand). */
export type DentistScoringBatchContext = {
  allNamesLower: string[];
};

const BRAND_STOPWORDS = new Set([
  "dental",
  "dentist",
  "dentistry",
  "care",
  "smile",
  "smiles",
  "family",
  "center",
  "centre",
  "office",
  "clinic",
  "associates",
  "associate",
  "the",
  "and",
  "llc",
  "inc",
  "pa",
  "dds",
  "dmd",
  "of",
  "pllc",
]);

function significantNameTokens(nameLower: string): string[] {
  return nameLower
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !BRAND_STOPWORDS.has(t));
}

function repeatedBrandPenalty(nameLower: string, allNamesLower: string[]): number {
  const tokenCounts = new Map<string, number>();
  for (const n of allNamesLower) {
    const uniq = new Set(significantNameTokens(n));
    Array.from(uniq).forEach((t) => {
      tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
    });
  }
  for (const t of significantNameTokens(nameLower)) {
    if ((tokenCounts.get(t) ?? 0) >= 3) return -6;
  }
  return 0;
}

export function computeNameHeuristicAdjustment(lead: Lead, batch?: DentistScoringBatchContext): number {
  let adj = 0;
  const name = lead.name.toLowerCase();

  if (/\bgroup\b/.test(name)) adj -= 6;
  if (/\bpartners\b/.test(name)) adj -= 6;
  if (/\bswish\b/.test(name)) adj -= 6;

  const rc = lead.reviewCount ?? 0;
  const rating = lead.rating ?? 0;
  if (/\bhaus\b/.test(name) && rating >= 4.8 && rc >= 250) {
    adj -= 6;
  }

  if (batch?.allNamesLower?.length) {
    const downtownCount = batch.allNamesLower.filter((n) => n.includes("downtown")).length;
    if (name.includes("downtown") && downtownCount >= 2) {
      adj -= 6;
    }
    adj += repeatedBrandPenalty(name, batch.allNamesLower);
  }

  return adj;
}

/**
 * Soft demotion for listings that already look dominant on Maps.
 * Intentionally does NOT penalize 200–800 review range at 5.0 vs 170 at 5.0 (same rating should stay close).
 */
function dominantPracticeAdjustment(lead: Lead): number {
  const r = lead.rating;
  const rc = lead.reviewCount;
  if (r === null || r === undefined || rc === null || rc === undefined) return 0;
  if (r >= 4.8 && rc >= REVIEW_SATURATION) return -10;
  if (r >= 4.8 && rc >= 800 && rc < REVIEW_SATURATION) return -4;
  return 0;
}

/**
 * Fit 0–100: are they a practice we can plausibly help with acquisition work (not already maxed out)?
 * Higher = better fit for our offer.
 */
function fitSignal(lead: Lead): number {
  let s = 52;
  const r = lead.rating;
  const rc = lead.reviewCount ?? 0;
  if (r !== null && r !== undefined) {
    if (r < 4.0) s += 28;
    else if (r < 4.3) s += 22;
    else if (r <= 4.6) s += 12;
    else if (r < RATING_STRONG) s += 6;
    else s += 2;
  }
  if (rc >= REVIEW_SATURATION && (r ?? 0) >= 4.8) {
    s -= 35;
  } else if (rc >= 500 && (r ?? 0) >= 4.85) {
    s -= 12;
  }
  if (!lead.website?.trim()) s += 10;
  return Math.max(0, Math.min(100, s));
}

/**
 * Opportunity 0–100: visible gap we can point to (thin proof, missing site, not saturated growth case).
 */
function opportunitySignal(lead: Lead): number {
  let s = 48;
  const r = lead.rating ?? null;
  const rc = lead.reviewCount ?? null;
  const rcN = rc !== null && Number.isFinite(Number(rc)) ? Number(rc) : null;
  const rN = r !== null && Number.isFinite(Number(r)) ? Number(r) : null;

  if (!lead.website?.trim()) s += 22;
  if (rN !== null && rN < 4.3) s += 24;
  else if (rN !== null && rN < 4.6) s += 12;

  if (rcN !== null) {
    if (rcN < 25) s += 18;
    else if (rcN < 80) s += 10;
    else if (rcN >= 200 && rcN <= 800 && (rN ?? 0) >= 4.7) s += 8;
    // Plateau: extra reviews at the same high rating do not keep subtracting opportunity.
    if (rcN >= REVIEW_SATURATION && (rN ?? 0) >= 4.8) s -= 30;
  }

  return Math.max(0, Math.min(100, s));
}

/**
 * Rule-based score (1–100): weighted Fit + Opportunity, plus small name/dominant deltas.
 * Reachability stays on export columns and sort tiebreak, not in this number. Weights in `lib/lead-pipeline-config.ts`.
 */
export function computeBaseScore(lead: Lead, batch?: DentistScoringBatchContext): number {
  const w = SCORING_WEIGHTS;
  const fit = fitSignal(lead);
  const opp = opportunitySignal(lead);
  /** Priority score uses Fit + Opportunity only. Reachability stays on the CSV and sort tiebreak, not here. */
  let combined = fit * w.fit + opp * w.opportunity;
  combined += dominantPracticeAdjustment(lead);
  combined += computeNameHeuristicAdjustment(lead, batch);

  const primary = (lead.primaryType ?? "").toLowerCase();
  if (primary.includes("dentist") || primary.includes("dental")) {
    combined += 3;
  }
  if (!lead.phone?.trim()) {
    combined -= 6;
  }

  return Math.max(1, Math.min(100, Math.round(combined)));
}

export function classifyOpportunityType(lead: Lead): string {
  if (!lead.website?.trim()) return "no_website";
  const arch = classifyOutreachArchetype(lead);
  if (arch === "high_volume_saturation") return "high_volume_saturation";
  if (arch === "reputation_gap") return "reputation_gap";
  if (arch === "newer_unknown") return "newer_unknown";
  if (arch === "established_static") return "established_static";
  return "general_growth";
}

export function classifyPriorityFromScore(score: number): "high" | "medium" | "low" {
  if (score >= PRIORITY_SCORE_HIGH_MIN) return "high";
  if (score >= PRIORITY_SCORE_MEDIUM_MIN) return "medium";
  return "low";
}

/** One-line reason for CSV that ties to a concrete signal (not platitudes). */
export function computeExportReasonLine(lead: Lead, opts?: { clusterDemoted?: boolean }): string {
  if (opts?.clusterDemoted) {
    return "Co-located listing in this export. Demoted so you do not double-contact the same address.";
  }
  const parts: string[] = [];
  if (!lead.website?.trim()) parts.push("No standalone website on file.");
  const r = lead.rating;
  const rc = lead.reviewCount;
  if (r !== null && r !== undefined && r < 4.3) parts.push(`Public rating ${r} is a visible bottleneck.`);
  if (rc !== null && rc !== undefined && rc < 30) parts.push("Review count is still thin versus nearby peers.");
  if (rc !== null && rc !== undefined && rc >= REVIEW_SATURATION && (r ?? 0) >= 4.8) {
    parts.push("Very high review volume. Growth cold outreach is a poor fit. Use hiring or referral angle only.");
  }
  if ((lead.primaryEmail ?? "").trim()) parts.push("Primary email on file.");
  else if ((lead.contactFormUrl ?? "").trim()) parts.push("Contact form path on file.");
  else if ((lead.phone ?? "").trim()) parts.push("Phone only on file. Digital path still thin.");

  if (parts.length === 0) {
    return "Rule blend of fit and opportunity (see score). Reachability is separate on export.";
  }
  return parts.slice(0, 2).join(" ");
}

export function ensureMinimumHighPriority<T extends { score?: number; priority?: string | null }>(
  leads: T[],
  opts?: { minHigh?: number }
): T[] {
  const minHigh = opts?.minHigh ?? 0;
  if (minHigh <= 0 || leads.length === 0) return leads;
  const out = leads.map((l) => ({ ...l }));
  let highCount = out.filter((l) => (l.priority ?? "").toLowerCase() === "high").length;
  if (highCount >= minHigh) return out;

  const byScore = out
    .map((l, idx) => ({ idx, s: typeof l.score === "number" ? l.score : -1 }))
    .sort((a, b) => b.s - a.s);

  for (const { idx } of byScore) {
    if (highCount >= minHigh) break;
    if ((out[idx].priority ?? "").toLowerCase() !== "high") {
      out[idx] = { ...out[idx], priority: "high" };
      highCount += 1;
    }
  }
  return out;
}
