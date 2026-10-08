import { classifyPriorityForLead } from "@/lib/dentist-scoring";
import { normalizeAddressKey } from "@/lib/lead-quality-filters";
import { priorityRank, sortByPriorityThenScore } from "@/lib/lead-pack-export";
import type { Lead } from "@/lib/types";

export const MULTI_LOCATION_GROUP_LABEL = "Multi-location group";
export const MULTI_LOCATION_SCORE_PENALTY = 15;

const BRAND_STOP = new Set([
  "dental",
  "dentistry",
  "dentist",
  "the",
  "and",
  "of",
  "llc",
  "inc",
  "pa",
  "pllc",
]);

const BRAND_SUFFIX_PATTERNS: RegExp[] = [
  /\s*&\s*orthodontics?\b/gi,
  /\s+and\s+orthodontics?\b/gi,
  /\s+dental\s+center\b/gi,
  /\s+family\s+dentistry\b/gi,
  /\s+dental\s+group\b/gi,
  /\s+family\s+dental\b/gi,
  /\s+dental\s+office\b/gi,
  /\s+dental\s+practice\b/gi,
  /\s+orthodontics?\b/gi,
];

/** Remove service-line suffixes so "Access Dental" matches "Access Dental & Orthodontics". */
export function stripBrandSuffixes(name: string): string {
  let s = name.trim();
  for (const re of BRAND_SUFFIX_PATTERNS) {
    s = s.replace(re, "").trim();
  }
  return s.replace(/\s{2,}/g, " ").trim();
}

/** Strip trailing " - Riverside", " | Austin", or "(Downtown)" style suffixes. */
export function stripLocationSuffixFromName(name: string): string {
  let base = stripBrandSuffixes(name);
  base = base.replace(/\s[-–—|]\s*[A-Za-z0-9][A-Za-z0-9\s.'-]{0,48}$/, "").trim();
  base = base.replace(/\s*\([A-Za-z0-9][A-Za-z0-9\s.'-]{0,48}\)\s*$/, "").trim();
  return base;
}

export function hasExplicitLocationSuffix(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  if (!n) return false;
  return (
    /\s[-–—|]\s*[A-Za-z]/.test(n) ||
    /\([A-Za-z][A-Za-z0-9\s.'-]{1,48}\)\s*$/.test(n)
  );
}

/** Normalized brand key for same-name / multi-address detection in one market. */
export function normalizeBrandKey(name: string | null | undefined): string {
  const base = stripLocationSuffixFromName(name ?? "")
    .toLowerCase()
    .replace(/\bdental\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = base
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !BRAND_STOP.has(t));
  if (tokens.length === 0) return base.replace(/[^a-z0-9]+/g, " ").trim();
  return tokens.join(" ");
}

export type MultiLocationContext = Map<string, { addressKeys: Set<string> }>;

export function buildMultiLocationContext(leads: Lead[]): MultiLocationContext {
  const m = new Map<string, { addressKeys: Set<string> }>();
  for (const lead of leads) {
    const brand = normalizeBrandKey(lead.name);
    if (!brand || brand.length < 3) continue;
    const addr = normalizeAddressKey(lead.address);
    const entry = m.get(brand) ?? { addressKeys: new Set<string>() };
    if (addr) entry.addressKeys.add(addr);
    m.set(brand, entry);
  }
  return m;
}

export function isMultiLocationGroupLead(
  lead: Pick<Lead, "name" | "address" | "metadata">,
  ctx?: MultiLocationContext
): boolean {
  if (lead.metadata?.multiLocationGroup === true) return true;
  const name = lead.name ?? "";
  if (hasExplicitLocationSuffix(name)) return true;
  if (!ctx) return false;
  const brand = normalizeBrandKey(name);
  const entry = ctx.get(brand);
  return Boolean(entry && entry.addressKeys.size >= 2);
}

export function isIndependentPracticeLead(lead: Pick<Lead, "name" | "address" | "metadata">): boolean {
  return !isMultiLocationGroupLead(lead);
}

/** Score demotion + metadata flag; re-sort with independents ahead of multi-location groups. */
export function applyMultiLocationGroupRankAdjustments(leads: Lead[]): Lead[] {
  const ctx = buildMultiLocationContext(leads);
  const adjusted = leads.map((lead) => {
    const multi = isMultiLocationGroupLead(lead, ctx);
    if (!multi) return lead;
    const score = Math.max(1, (lead.score ?? 50) - MULTI_LOCATION_SCORE_PENALTY);
    return {
      ...lead,
      score,
      priority: classifyPriorityForLead(lead, score),
      metadata: {
        ...lead.metadata,
        multiLocationGroup: true,
      },
    };
  });
  return sortLeadsIndependentBeforeMultiLocation(adjusted);
}

export function sortLeadsIndependentBeforeMultiLocation<T extends Lead>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aMulti = isMultiLocationGroupLead(a);
    const bMulti = isMultiLocationGroupLead(b);
    if (aMulti !== bMulti) return aMulti ? 1 : -1;
    const pr = priorityRank(b.priority) - priorityRank(a.priority);
    if (pr !== 0) return pr;
    return (b.score ?? -Infinity) - (a.score ?? -Infinity);
  });
}

/** Pack sort: priority/score first, but independents always rank above multi-location groups. */
export function sortScoredLeadsForMarket(rows: Lead[]): Lead[] {
  return sortLeadsIndependentBeforeMultiLocation(sortByPriorityThenScore(rows));
}
