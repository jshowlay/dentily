import type { Lead } from "@/lib/types";

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

/** Repeated distinctive token across many results → likely chain / shared brand. */
function repeatedBrandPenalty(nameLower: string, allNamesLower: string[]): number {
  const tokenCounts = new Map<string, number>();
  for (const n of allNamesLower) {
    const uniq = new Set(significantNameTokens(n));
    Array.from(uniq).forEach((t) => {
      tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
    });
  }
  for (const t of significantNameTokens(nameLower)) {
    if ((tokenCounts.get(t) ?? 0) >= 3) return -8;
  }
  return 0;
}

/**
 * Larger brands / multi-location signals. Negative values subtract from base score.
 */
export function computeNameHeuristicAdjustment(
  lead: Lead,
  batch?: DentistScoringBatchContext
): number {
  let adj = 0;
  const name = lead.name.toLowerCase();

  if (/\bgroup\b/.test(name)) adj -= 8;
  if (/\bpartners\b/.test(name)) adj -= 8;
  if (/\bswish\b/.test(name)) adj -= 8;

  const rc = lead.reviewCount ?? 0;
  const rating = lead.rating ?? 0;
  if (/\bhaus\b/.test(name) && rating >= 4.8 && rc >= 250) {
    adj -= 8;
  }

  if (batch?.allNamesLower?.length) {
    const downtownCount = batch.allNamesLower.filter((n) => n.includes("downtown")).length;
    if (name.includes("downtown") && downtownCount >= 2) {
      adj -= 8;
    }
    adj += repeatedBrandPenalty(name, batch.allNamesLower);
  }

  return adj;
}

/** Already very strong digitally — deprioritize. Check 500+ reviews before 250+. */
function dominantPracticeAdjustment(lead: Lead): number {
  const r = lead.rating;
  const rc = lead.reviewCount;
  if (r === null || r === undefined || rc === null || rc === undefined) return 0;
  if (r >= 4.8 && rc >= 500) return -15;
  if (r >= 4.8 && rc >= 250) return -10;
  return 0;
}

/** Rule-based score before AI adjustment (1–100). */
export function computeBaseScore(lead: Lead, batch?: DentistScoringBatchContext): number {
  let score = 65;
  const reviewCount = lead.reviewCount;
  const rating = lead.rating;
  const primaryType = lead.primaryType;

  if (reviewCount !== null && reviewCount !== undefined) {
    if (reviewCount < 10) score += 12;
    else if (reviewCount < 25) score += 10;
    else if (reviewCount < 50) score += 6;
    else if (reviewCount > 400) score -= 15;
    else if (reviewCount > 200) score -= 10;
  }

  if (rating !== null && rating !== undefined) {
    if (rating < 4.0) score += 8;
    else if (rating >= 4.0 && rating <= 4.5) score += 6;
    else if (rating > 4.7) score -= 6;
  }

  if (!lead.website) score += 15;

  if (!lead.phone) score -= 8;

  if (primaryType) {
    const type = primaryType.toLowerCase();
    if (type.includes("dentist") || type.includes("dental")) score += 4;
  }

  score += dominantPracticeAdjustment(lead);
  score += computeNameHeuristicAdjustment(lead, batch);

  return Math.max(1, Math.min(100, Math.round(score)));
}

export function classifyOpportunityType(lead: Lead): string {
  if (!lead.website) return "no_website";

  const rc = lead.reviewCount;
  if (rc != null && rc < 20) return "low_reviews";
  if (rc != null && rc < 75) return "moderate_reviews_growth";

  const rating = lead.rating;
  if (rating != null && rating < 4.2) return "reputation_improvement";

  return "general_growth";
}

export function classifyPriorityFromScore(score: number): "high" | "medium" | "low" {
  if (score >= 65) return "high";
  if (score >= 50) return "medium";
  return "low";
}
