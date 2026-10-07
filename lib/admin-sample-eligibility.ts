import {
  isExcludedCommunityClinic,
  looksLikeIndividualProviderName,
} from "@/lib/lead-quality-filters";
import {
  buildMultiLocationContext,
  hasExplicitLocationSuffix,
  isMultiLocationGroupLead,
  normalizeBrandKey,
  stripLocationSuffixFromName,
} from "@/lib/multi-location-group";
import { registrableHostFromUrl } from "@/lib/url-normalize";
import type { Lead } from "@/lib/types";

const GENERIC_DENTAL_WORDS = new Set([
  "dentist",
  "dentists",
  "dental",
  "dentistry",
  "emergency",
  "office",
  "clinic",
  "care",
  "center",
  "centre",
  "the",
  "in",
  "at",
  "near",
  "and",
  "of",
  "tx",
  "ca",
  "fl",
  "ny",
]);

/** SEO-style listings with no real brand ("Dentist in Austin", "Austin Dentist", etc.). */
export function isGenericKeywordPracticeName(
  name: string | null | undefined,
  marketCity?: string | null
): boolean {
  const raw = (name ?? "").trim();
  if (!raw) return true;
  const n = raw.toLowerCase();

  if (/\bdentist\s+in\s+[a-z]/i.test(raw)) return true;
  if (/\bdentists?\s+(in|at|near)\s+[a-z]/i.test(raw)) return true;
  if (/^emergency\s+dent(ist|al)\b/i.test(raw)) return true;

  const cityToken = (marketCity ?? "")
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)[0];

  const tokens = n.split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  const brandTokens = tokens.filter((t) => {
    if (GENERIC_DENTAL_WORDS.has(t)) return false;
    if (cityToken && t === cityToken) return false;
    if (/^\d+$/.test(t)) return false;
    return true;
  });

  const hasDental = tokens.some((t) => t.includes("dent"));
  if (hasDental && brandTokens.length === 0) return true;

  if (cityToken && hasDental && brandTokens.length === 1 && brandTokens[0] === cityToken) {
    return true;
  }

  const normalized = stripLocationSuffixFromName(raw).toLowerCase();
  if (/^(best|top|local|nearby)\s+dent/.test(normalized)) return true;

  return false;
}

/** Place IDs to drop from /admin/sample (chains, shared domains, generic names, etc.). */
export function computeAdminSampleExcludedPlaceIds(
  leads: Lead[],
  marketCity?: string | null
): Set<string> {
  const excluded = new Set<string>();
  const multiCtx = buildMultiLocationContext(leads);

  for (const lead of leads) {
    if (isExcludedCommunityClinic(lead)) excluded.add(lead.placeId);
    if (looksLikeIndividualProviderName(lead.name)) excluded.add(lead.placeId);
    if (isGenericKeywordPracticeName(lead.name, marketCity)) excluded.add(lead.placeId);
    if (hasExplicitLocationSuffix(lead.name)) excluded.add(lead.placeId);
    if (isMultiLocationGroupLead(lead, multiCtx)) excluded.add(lead.placeId);
  }

  const byDomain = new Map<string, Lead[]>();
  for (const lead of leads) {
    const domain = registrableHostFromUrl(lead.website);
    if (!domain || domain.length < 4) continue;
    const list = byDomain.get(domain) ?? [];
    list.push(lead);
    byDomain.set(domain, list);
  }
  for (const list of Array.from(byDomain.values())) {
    if (list.length >= 2) {
      for (const l of list) excluded.add(l.placeId);
    }
  }

  const byBrand = new Map<string, Lead[]>();
  for (const lead of leads) {
    const brand = normalizeBrandKey(lead.name);
    if (!brand || brand.length < 2) continue;
    const list = byBrand.get(brand) ?? [];
    list.push(lead);
    byBrand.set(brand, list);
  }
  for (const list of Array.from(byBrand.values())) {
    const brands = new Set(list.map((l) => normalizeBrandKey(l.name)));
    if (list.length >= 2 && brands.size === 1) {
      for (const l of list) excluded.add(l.placeId);
    }
  }

  return excluded;
}

export function filterLeadsForAdminSample(leads: Lead[], marketCity?: string | null): Lead[] {
  const excluded = computeAdminSampleExcludedPlaceIds(leads, marketCity);
  return leads.filter((l) => !excluded.has(l.placeId));
}
