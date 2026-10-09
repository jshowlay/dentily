import { normalizeChainBrandKey } from "@/lib/admin-sample-chain-probe";
import { registrableHostFromUrl } from "@/lib/url-normalize";
import type { Lead } from "@/lib/types";

/** Tokens that alone do not identify a multi-location brand. */
export const GENERIC_CHAIN_BRAND_TOKENS = new Set([
  "dental",
  "dentistry",
  "dentist",
  "center",
  "centre",
  "family",
  "smile",
  "smiles",
  "care",
  "clinic",
  "group",
  "office",
  "practice",
  "associates",
  "oral",
  "orthodontics",
  "orthodontic",
  "endodontics",
  "periodontics",
  "implant",
  "implants",
  "cosmetic",
  "pediatric",
  "the",
  "and",
  "of",
  "la",
]);

export function isDistinctiveChainBrandKey(key: string | null | undefined): boolean {
  const k = (key ?? "").trim().toLowerCase();
  if (!k || k.length < 3) return false;
  const tokens = k.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return false;
  return tokens.some((t) => !GENERIC_CHAIN_BRAND_TOKENS.has(t));
}

function normalizePhoneKey(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

/** Generic brand keys only qualify as a chain when contact anchors match within the group. */
export function chainBrandGroupHasSharedDomainOrPhone(members: Lead[]): boolean {
  const domainCounts = new Map<string, number>();
  const phoneCounts = new Map<string, number>();
  for (const lead of members) {
    const domain = (registrableHostFromUrl(lead.website) ?? "").toLowerCase();
    if (domain.length >= 4) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
    const phone = normalizePhoneKey(lead.phone);
    if (phone) {
      phoneCounts.set(phone, (phoneCounts.get(phone) ?? 0) + 1);
    }
  }
  if (Array.from(domainCounts.values()).some((n) => n >= 2)) return true;
  if (Array.from(phoneCounts.values()).some((n) => n >= 2)) return true;
  return false;
}

export function buildChainBrandGroups(leads: Lead[]): Map<string, Lead[]> {
  const groups = new Map<string, Lead[]>();
  for (const lead of leads) {
    const key = normalizeChainBrandKey(lead.name);
    if (!key || key.length < 2) continue;
    const list = groups.get(key) ?? [];
    list.push(lead);
    groups.set(key, list);
  }
  return groups;
}

export type ChainBrandGroupQualification =
  | { kind: "distinctive_brand_prefix"; brandKey: string }
  | { kind: "generic_brand_plus_domain"; brandKey: string; domain: string }
  | { kind: "generic_brand_plus_phone"; brandKey: string; phone: string };

export function qualifyChainBrandGroup(
  brandKey: string,
  members: Lead[]
): ChainBrandGroupQualification | null {
  if (members.length < 2) return null;
  if (isDistinctiveChainBrandKey(brandKey)) {
    return { kind: "distinctive_brand_prefix", brandKey };
  }
  const domainCounts = new Map<string, number>();
  for (const lead of members) {
    const domain = (registrableHostFromUrl(lead.website) ?? "").toLowerCase();
    if (domain.length >= 4) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
  }
  for (const [domain, n] of Array.from(domainCounts.entries())) {
    if (n >= 2) return { kind: "generic_brand_plus_domain", brandKey, domain };
  }
  const phoneTally = new Map<string, number>();
  for (const lead of members) {
    const phone = normalizePhoneKey(lead.phone);
    if (phone) phoneTally.set(phone, (phoneTally.get(phone) ?? 0) + 1);
  }
  for (const [phone, n] of Array.from(phoneTally.entries())) {
    if (n >= 2) return { kind: "generic_brand_plus_phone", brandKey, phone };
  }
  return null;
}

/** Place IDs that share a qualifying stripped “of …” / location brand prefix cluster. */
export function buildSharedChainBrandPlaceIds(leads: Lead[]): Set<string> {
  const out = new Set<string>();
  for (const [brandKey, members] of Array.from(buildChainBrandGroups(leads).entries())) {
    if (qualifyChainBrandGroup(brandKey, members)) {
      for (const m of members) out.add(m.placeId);
    }
  }
  return out;
}
