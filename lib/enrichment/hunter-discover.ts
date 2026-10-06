/**
 * Hunter.io Discover + Domain Finder — candidate domains for a practice name / location.
 */

const HUNTER_BASE = "https://api.hunter.io/v2";

export type HunterDomainCandidate = {
  domain: string;
  organization?: string | null;
};

function apiKey(): string | null {
  const k = process.env.HUNTER_API_KEY?.trim();
  return k || null;
}

/** Domain Finder (company name → likely domain). */
export async function hunterDomainFinder(company: string): Promise<HunterDomainCandidate[]> {
  const key = apiKey();
  if (!key) return [];

  const companyTrim = company.trim();
  if (!companyTrim) return [];

  try {
    const params = new URLSearchParams({ company: companyTrim, api_key: key });
    const res = await fetch(`${HUNTER_BASE}/domain-finder?${params.toString()}`);
    if (!res.ok) {
      console.warn(`[hunter-discover] domain-finder HTTP ${res.status} company=${JSON.stringify(companyTrim)}`);
      return [];
    }
    const json = (await res.json()) as {
      data?: { domain?: string | null; emails?: unknown[] };
    };
    const domain = (json.data?.domain ?? "").trim().toLowerCase();
    if (!domain || !domain.includes(".")) return [];
    return [{ domain, organization: companyTrim }];
  } catch (e) {
    console.error("[hunter-discover] domain-finder failed", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Discover API — organization name + optional city filter. Free; max 100 per call. */
export async function hunterDiscoverByOrganizationName(
  practiceName: string,
  city?: string | null,
  state?: string | null
): Promise<HunterDomainCandidate[]> {
  const key = apiKey();
  if (!key) return [];

  const name = practiceName.trim();
  if (!name) return [];

  const body: Record<string, unknown> = {
    organization: { name: [name] },
  };
  const cityTrim = (city ?? "").trim();
  const stateTrim = (state ?? "").trim();
  if (cityTrim || stateTrim) {
    body.headquarters_location = {
      include: [
        {
          country: "US",
          ...(cityTrim ? { city: cityTrim } : {}),
          ...(stateTrim ? { state: stateTrim } : {}),
        },
      ],
    };
  }

  try {
    const res = await fetch(`${HUNTER_BASE}/discover?api_key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[hunter-discover] discover HTTP ${res.status} ${text.slice(0, 200)}`);
      return [];
    }
    const json = (await res.json()) as {
      data?: Array<{ domain?: string | null; organization?: string | null }>;
    };
    const out: HunterDomainCandidate[] = [];
    const seen = new Set<string>();
    for (const row of json.data ?? []) {
      const domain = (row.domain ?? "").trim().toLowerCase().replace(/^www\./, "");
      if (!domain || !domain.includes(".") || seen.has(domain)) continue;
      seen.add(domain);
      out.push({ domain, organization: row.organization ?? null });
    }
    return out;
  } catch (e) {
    console.error("[hunter-discover] discover failed", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Natural-language Discover query (free). */
export async function hunterDiscoverByQuery(query: string): Promise<HunterDomainCandidate[]> {
  const key = apiKey();
  if (!key) return [];
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(`${HUNTER_BASE}/discover?api_key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: q }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Array<{ domain?: string | null; organization?: string | null }>;
    };
    const out: HunterDomainCandidate[] = [];
    const seen = new Set<string>();
    for (const row of json.data ?? []) {
      const domain = (row.domain ?? "").trim().toLowerCase().replace(/^www\./, "");
      if (!domain || !domain.includes(".") || seen.has(domain)) continue;
      seen.add(domain);
      out.push({ domain, organization: row.organization ?? null });
    }
    return out;
  } catch {
    return [];
  }
}

/** Merge Domain Finder + Discover, deduped, cap N. */
export async function hunterCandidateDomainsForPractice(
  practiceName: string,
  city?: string | null,
  state?: string | null,
  cap = 12
): Promise<HunterDomainCandidate[]> {
  const cityTrim = (city ?? "").trim();
  const stateTrim = (state ?? "").trim();
  const queryParts = [practiceName, "dental", cityTrim, stateTrim, "United States"].filter(Boolean);
  const [finder, discover, discoverQuery] = await Promise.all([
    hunterDomainFinder(practiceName),
    hunterDiscoverByOrganizationName(practiceName, cityTrim, stateTrim),
    hunterDiscoverByQuery(queryParts.join(" ")),
  ]);
  const merged: HunterDomainCandidate[] = [];
  const seen = new Set<string>();
  for (const c of [...finder, ...discover, ...discoverQuery]) {
    if (seen.has(c.domain)) continue;
    seen.add(c.domain);
    merged.push(c);
    if (merged.length >= cap) break;
  }
  return merged;
}
