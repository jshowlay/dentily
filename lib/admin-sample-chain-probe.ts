import { searchBusinesses } from "@/lib/google-places";
import {
  DSO_BRAND_NAME_FRAGMENTS,
  DSO_GROUP_EMAIL_DOMAINS,
  DSO_MULTI_LOCATION_PATH_RE,
} from "@/lib/dso-brands";
import { normalizeBrandKey, stripLocationSuffixFromName } from "@/lib/multi-location-group";
import { registrableHostFromUrl } from "@/lib/url-normalize";
import type { Lead } from "@/lib/types";

/** Full practice name after suffix strip — used for chain grouping (keeps "dental"). */
export function normalizeChainBrandKey(name: string | null | undefined): string {
  return stripLocationSuffixFromName(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isKnownMultiLocationChainListing(
  lead: Pick<Lead, "name" | "website">
): boolean {
  const n = (lead.name ?? "").toLowerCase();
  if (DSO_BRAND_NAME_FRAGMENTS.some((frag) => n.includes(frag))) return true;
  const domain = registrableHostFromUrl(lead.website);
  if (domain && DSO_GROUP_EMAIL_DOMAINS.has(domain)) return true;
  const site = lead.website ?? "";
  if (site && DSO_MULTI_LOCATION_PATH_RE.test(site)) return true;
  return false;
}

function groupByBrandKey(leads: Lead[]): Map<string, Lead[]> {
  const m = new Map<string, Lead[]>();
  for (const lead of leads) {
    const key = normalizeBrandKey(lead.name);
    if (!key || key.length < 2) continue;
    const list = m.get(key) ?? [];
    list.push(lead);
    m.set(key, list);
  }
  return m;
}

/**
 * Brands with 2+ locations in the market (in-pack or via a targeted Places probe).
 * All listings for these brand keys should be excluded from /admin/sample.
 */
export async function discoverMultiLocationBrandKeys(
  leads: Lead[],
  location: string,
  opts?: { maxProbes?: number }
): Promise<Set<string>> {
  const maxProbes = opts?.maxProbes ?? 24;
  const chainKeys = new Set<string>();

  const byBrand = groupByBrandKey(leads);
  for (const [key, list] of Array.from(byBrand.entries())) {
    if (list.length >= 2) chainKeys.add(key);
  }

  const byChainName = new Map<string, Lead[]>();
  for (const lead of leads) {
    const ck = normalizeChainBrandKey(lead.name);
    if (!ck || ck.length < 4) continue;
    const list = byChainName.get(ck) ?? [];
    list.push(lead);
    byChainName.set(ck, list);
  }
  for (const [ck, list] of Array.from(byChainName.entries())) {
    if (list.length >= 2) {
      for (const l of list) {
        const k = normalizeBrandKey(l.name);
        if (k) chainKeys.add(k);
      }
    }
  }

  for (const lead of leads) {
    if (isKnownMultiLocationChainListing(lead)) {
      const k = normalizeBrandKey(lead.name);
      if (k) chainKeys.add(k);
    }
  }

  const probeCandidates: Array<{ key: string; sample: Lead; score: number }> = [];
  for (const [key, list] of Array.from(byBrand.entries())) {
    if (list.length >= 2 || chainKeys.has(key)) continue;
    const sample = list[0]!;
    probeCandidates.push({ key, sample, score: sample.score ?? 0 });
  }
  probeCandidates.sort((a, b) => b.score - a.score);

  let probes = 0;
  for (const { key, sample } of probeCandidates) {
    if (probes >= maxProbes) break;
    if (chainKeys.has(key)) continue;
    const queryName = stripLocationSuffixFromName(sample.name);
    if (queryName.length < 4) continue;
    probes += 1;
    try {
      const places = await searchBusinesses(`${queryName} in ${location}`, 60);
      let matches = 0;
      for (const p of places) {
        if (normalizeBrandKey(p.name) === key) matches += 1;
      }
      if (matches >= 2) chainKeys.add(key);
    } catch (e) {
      console.warn("[admin-sample-chain-probe] probe failed", { queryName, location, e });
    }
  }

  return chainKeys;
}

export function leadMatchesMultiLocationBrandKey(
  lead: Pick<Lead, "name">,
  brandKeys: Set<string>
): boolean {
  const key = normalizeBrandKey(lead.name);
  return Boolean(key && brandKeys.has(key));
}
