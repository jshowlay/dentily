import type { Lead } from "@/lib/types";

/** Same normalization as lead-pack-export (kept local to avoid import cycles). */
export function normalizeAddressKey(address: string | null | undefined): string {
  const raw = (address ?? "").toLowerCase();
  if (!raw.trim()) return "";
  let a = raw.replace(/,?\s*(suite|ste|unit|#|apt|bldg|building)\.?\s*[a-z0-9-]+/gi, "");
  a = a.replace(/[^a-z0-9]+/g, " ");
  return a.replace(/\s+/g, " ").trim();
}

/** Minimum public reviews before rating drives opportunity type, score bumps, or export reason lines. */
export const MIN_REVIEWS_FOR_RATING_SIGNALS = 15;

const PRACTICE_NAME_HINT =
  /\b(dental|dentistry|orthodont|smile|smiles|family|care|center|centre|clinic|group|office|practice|associates|oral|periodont|endodont|prosthodont|pediatric|implant|cosmetic)\b/i;

const EXCLUDED_CLINIC_NAME =
  /\b(community\s+(health|dental|clinic)|free\s+clinic|ministr(?:y|ies)|de\s+cristo|fqhc|school\s+of\s+dentistry|federally\s+qualified|charit(?:y|able)|non-?profit|county\s+(health|dental)|public\s+health)\b/i;

const EXCLUDED_CLINIC_TYPE =
  /\b(university|school|government|hospital|health_clinic|community_health_center)\b/;

const UNIVERSITY_DENTAL =
  /\b(university|college)\b.*\b(dental|dentistry)\b|\b(dental|dentistry)\b.*\b(university|college|school)\b/i;

/** Nonprofit / community / university dental listings — not B2B growth targets. */
export function isExcludedCommunityClinic(lead: Pick<Lead, "name" | "primaryType">): boolean {
  const name = (lead.name ?? "").trim();
  if (!name) return false;
  if (EXCLUDED_CLINIC_NAME.test(name)) return true;
  if (UNIVERSITY_DENTAL.test(name)) return true;
  const pt = (lead.primaryType ?? "").toLowerCase();
  if (pt && EXCLUDED_CLINIC_TYPE.test(pt)) return true;
  return false;
}

/** Personal Google provider profiles (Dr Name DDS), not the practice brand listing. */
export function looksLikeIndividualProviderName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  if (!n) return false;

  if (/:\s*[A-Za-z][A-Za-z\s.'-]+,?\s*(DDS|DMD)\b/i.test(n)) {
    return true;
  }

  if (PRACTICE_NAME_HINT.test(n)) return false;

  if (/\b(DDS|DMD)\b/i.test(n)) return true;

  if (/^Dr\.?\s+[A-Za-z][A-Za-z'-]+\s+[A-Za-z][A-Za-z'-]+(\s+(DDS|DMD))?$/i.test(n)) {
    return true;
  }

  if (/^[A-Za-z][A-Za-z'-]+,\s*[A-Za-z][A-Za-z'-]+(\s+[A-Za-z][A-Za-z'-]+)?(\s*,?\s*(DDS|DMD))?$/i.test(n)) {
    return true;
  }

  return false;
}

export function looksLikePracticeListingName(name: string | null | undefined): boolean {
  return PRACTICE_NAME_HINT.test(name ?? "");
}

function groupByAddress(leads: Lead[]): Map<string, Lead[]> {
  const m = new Map<string, Lead[]>();
  for (const lead of leads) {
    const key = normalizeAddressKey(lead.address);
    if (!key) continue;
    const arr = m.get(key) ?? [];
    arr.push(lead);
    m.set(key, arr);
  }
  return m;
}

/**
 * When a provider listing shares an address with a practice, copy the practice website
 * so scoring does not treat them as "no website."
 */
export function applyColocatedPracticeWebsites(leads: Lead[]): Lead[] {
  const byAddr = groupByAddress(leads);
  const websiteByAddr = new Map<string, string>();

  for (const [key, group] of Array.from(byAddr.entries())) {
    for (const l of group) {
      if (!looksLikePracticeListingName(l.name)) continue;
      const site = l.website?.trim();
      if (site) {
        websiteByAddr.set(key, site);
        break;
      }
    }
    if (!websiteByAddr.has(key)) {
      for (const l of group) {
        const site = l.website?.trim();
        if (site && !looksLikeIndividualProviderName(l.name)) {
          websiteByAddr.set(key, site);
          break;
        }
      }
    }
  }

  return leads.map((lead) => {
    const key = normalizeAddressKey(lead.address);
    const inherited = key ? websiteByAddr.get(key) : undefined;
    if (!inherited || lead.website?.trim()) return lead;
    return { ...lead, website: inherited };
  });
}

/**
 * Drop community/university clinics and individual provider listings that sit on a
 * practice address (keep the practice row only).
 */
export function filterNonPracticeLeadQuality(leads: Lead[]): Lead[] {
  const byAddr = groupByAddress(leads);
  const practiceAtAddress = new Set<string>();
  for (const [key, group] of Array.from(byAddr.entries())) {
    if (group.some((l) => looksLikePracticeListingName(l.name))) {
      practiceAtAddress.add(key);
    }
  }

  return leads.filter((lead) => {
    if (isExcludedCommunityClinic(lead)) return false;

    const name = lead.name ?? "";
    if (!looksLikeIndividualProviderName(name)) return true;

    const key = normalizeAddressKey(lead.address);
    if (key && practiceAtAddress.has(key)) return false;

    return true;
  });
}

export function prepareLeadsForScoring(leads: Lead[]): Lead[] {
  const withSites = applyColocatedPracticeWebsites(leads);
  return filterNonPracticeLeadQuality(withSites);
}
