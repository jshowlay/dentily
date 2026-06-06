/**
 * Multi-tier email enrichment for a single practice domain (server-side only).
 *
 * Tiers run in order and short-circuit on the first success:
 *   1. Deep website crawl (contact/about/team pages)
 *   2. Common-pattern guessing + ZeroBounce batch verification
 *   3. Apollo.io people search
 *   4. NPI Registry provider match + Prospeo email finder
 *
 * Each tier is isolated in try/catch so a failure (or a missing API key) falls
 * through silently to the next. Results are cached in-process for 7 days.
 *
 * Native fetch only — no new dependencies. Do not import into client components.
 */

export type EnrichSource = "website_crawl" | "pattern_guess" | "apollo" | "npi_prospeo";
export type EnrichConfidence = "high" | "medium" | "low";

export type EnrichResult = {
  email: string | null;
  source: EnrichSource | null;
  confidence: EnrichConfidence | null;
  verified: boolean;
};

type CacheEntry = EnrichResult & { cachedAt: number };

const enrichCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 604_800_000; // 7 days

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const EXCLUDE_TOKENS = [
  "noreply",
  "donotreply",
  "webmaster",
  "privacy",
  "legal",
  "sentry",
  "support",
  "example",
];
const CONTACT_PATH_HINTS = ["/contact", "/about", "/team", "/staff", "/reach", "/location"];

const EMPTY: EnrichResult = { email: null, source: null, confidence: null, verified: false };

function isUsableEmail(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const e = raw.trim().toLowerCase();
  if (!e || e.length > 254) return false;
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(e)) return false;
  return !EXCLUDE_TOKENS.some((t) => e.includes(t));
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      url,
      {
        redirect: "follow",
        headers: {
          "User-Agent":
            "DentilyLeadBot/1.0 (+https://dentily.com; B2B practice research; polite crawl)",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      },
      timeoutMs
    );
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("html") && !ct.includes("xml")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractEmailsFromHtml(html: string): string[] {
  const found = new Set<string>();
  // mailto: hrefs first (highest signal)
  const mailtoRe = /mailto:([^"'?>\s]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = mailtoRe.exec(html)) !== null) {
    const e = decodeURIComponent(m[1] ?? "").trim();
    if (e) found.add(e);
  }
  const textMatches = html.match(EMAIL_RE) ?? [];
  for (const e of textMatches) found.add(e);
  return Array.from(found);
}

function collectInternalLinks(html: string, baseUrl: URL): string[] {
  const links = new Set<string>();
  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = (m[1] ?? "").trim();
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) continue;
    const lower = href.toLowerCase();
    if (!CONTACT_PATH_HINTS.some((h) => lower.includes(h))) continue;
    try {
      const abs = new URL(href, baseUrl);
      if (abs.hostname.replace(/^www\./, "") !== baseUrl.hostname.replace(/^www\./, "")) continue;
      abs.hash = "";
      links.add(abs.toString());
    } catch {
      /* skip malformed */
    }
  }
  return Array.from(links);
}

// ---------- Tier 1: deep website crawl ----------
async function tierWebsiteCrawl(domain: string): Promise<EnrichResult | null> {
  const rootUrl = `https://${domain}`;
  const rootHtml = await fetchHtml(rootUrl);
  if (rootHtml === null) return null;

  const base = new URL(rootUrl);

  const rootEmails = extractEmailsFromHtml(rootHtml).find(isUsableEmail);
  if (rootEmails) {
    return { email: rootEmails.toLowerCase(), source: "website_crawl", confidence: "high", verified: false };
  }

  // BFS over contact-like subpages, up to 10 pages / depth 3.
  const visited = new Set<string>([base.toString()]);
  let frontier: Array<{ url: string; depth: number }> = collectInternalLinks(rootHtml, base).map((u) => ({
    url: u,
    depth: 1,
  }));
  let fetched = 0;

  while (frontier.length > 0 && fetched < 10) {
    const next = frontier.shift()!;
    if (visited.has(next.url) || next.depth > 3) continue;
    visited.add(next.url);

    const html = await fetchHtml(next.url);
    fetched += 1;
    if (html === null) continue;

    const hit = extractEmailsFromHtml(html).find(isUsableEmail);
    if (hit) {
      return { email: hit.toLowerCase(), source: "website_crawl", confidence: "high", verified: false };
    }

    if (next.depth < 3) {
      const more = collectInternalLinks(html, base)
        .filter((u) => !visited.has(u))
        .map((u) => ({ url: u, depth: next.depth + 1 }));
      frontier = frontier.concat(more);
    }
  }

  return null;
}

// ---------- Tier 2: pattern guess + ZeroBounce ----------
const PATTERN_PREFIXES = [
  "info",
  "office",
  "front",
  "hello",
  "contact",
  "frontdesk",
  "admin",
  "appointments",
  "dr",
];

async function tierPatternGuess(domain: string): Promise<EnrichResult | null> {
  const apiKey = process.env.ZEROBOUNCE_API_KEY?.trim();
  if (!apiKey) return null;

  const candidates = PATTERN_PREFIXES.map((p) => `${p}@${domain}`);
  const res = await fetchWithTimeout(
    "https://bulkapi.zerobounce.net/v2/validatebatch",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        email_batch: candidates.map((email_address) => ({ email_address })),
      }),
    },
    15000
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    email_batch?: Array<{ address?: string; email_address?: string; status?: string }>;
  };
  const batch = data.email_batch ?? [];
  const valid = batch.find((b) => (b.status ?? "").toLowerCase() === "valid");
  const email = valid?.address ?? valid?.email_address ?? null;
  if (email && isUsableEmail(email)) {
    return { email: email.toLowerCase(), source: "pattern_guess", confidence: "high", verified: true };
  }
  return null;
}

// ---------- Tier 3: Apollo people search ----------
async function tierApollo(domain: string): Promise<EnrichResult | null> {
  const apiKey = process.env.APOLLO_API_KEY?.trim();
  if (!apiKey) return null;

  const res = await fetchWithTimeout(
    "https://api.apollo.io/v1/mixed_people/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        organization_domains: [domain],
        person_titles: [
          "dentist",
          "owner",
          "doctor",
          "dds",
          "dmd",
          "practice manager",
          "office manager",
        ],
        page: 1,
        per_page: 1,
      }),
    },
    15000
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { people?: Array<{ email?: string | null }> };
  const email = data.people?.[0]?.email ?? null;
  // Apollo masks locked emails as e.g. "email_not_unlocked@domain.com".
  if (email && !email.includes("email_not_unlocked") && isUsableEmail(email)) {
    return { email: email.toLowerCase(), source: "apollo", confidence: "medium", verified: false };
  }
  return null;
}

// ---------- Tier 4: NPI registry + Prospeo ----------
function normalizeName(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function tierNpiProspeo(
  domain: string,
  practiceName: string,
  city: string,
  state: string
): Promise<EnrichResult | null> {
  const prospeoKey = process.env.PROSPEO_API_KEY?.trim();
  if (!prospeoKey) return null;
  if (!city || !state) return null;

  const npiUrl =
    `https://npiregistry.cms.hhs.gov/api/?version=2.1&taxonomy_description=Dentist` +
    `&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&limit=10`;
  const npiRes = await fetchWithTimeout(npiUrl, {}, 12000);
  if (!npiRes.ok) return null;
  const npi = (await npiRes.json()) as {
    results?: Array<{ basic?: { first_name?: string; last_name?: string; organization_name?: string } }>;
  };
  const results = npi.results ?? [];
  const target = normalizeName(practiceName);

  let matched: { first?: string; last?: string } | null = null;
  for (const r of results) {
    const first = r.basic?.first_name ?? "";
    const last = r.basic?.last_name ?? "";
    const org = r.basic?.organization_name ?? "";
    const candidate = normalizeName(`${org} ${first} ${last}`);
    if (!candidate || !target) continue;
    if (candidate.includes(target) || target.includes(candidate) || (last && target.includes(normalizeName(last)))) {
      matched = { first, last };
      break;
    }
  }
  if (!matched?.first || !matched?.last) return null;

  const prospeoRes = await fetchWithTimeout(
    "https://api.prospeo.io/email-finder",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-KEY": prospeoKey },
      body: JSON.stringify({ first_name: matched.first, last_name: matched.last, domain }),
    },
    15000
  );
  if (!prospeoRes.ok) return null;
  const data = (await prospeoRes.json()) as {
    response?: { email?: string | null; confidence?: number };
    data?: { email?: string | null; confidence?: number };
  };
  const payload = data.response ?? data.data ?? {};
  const email = payload.email ?? null;
  const confidence = payload.confidence ?? 0;
  if (email && confidence >= 70 && isUsableEmail(email)) {
    return { email: email.toLowerCase(), source: "npi_prospeo", confidence: "medium", verified: false };
  }
  return null;
}

export async function enrichEmail(params: {
  domain: string;
  practice_name: string;
  city: string;
  state: string;
}): Promise<EnrichResult> {
  const domain = (params.domain || "").trim().toLowerCase().replace(/^www\./, "");
  if (!domain) return { ...EMPTY };

  const cached = enrichCache.get(domain);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    const { cachedAt: _cachedAt, ...result } = cached;
    return result;
  }

  const tiers: Array<() => Promise<EnrichResult | null>> = [
    () => tierWebsiteCrawl(domain),
    () => tierPatternGuess(domain),
    () => tierApollo(domain),
    () => tierNpiProspeo(domain, params.practice_name ?? "", params.city ?? "", params.state ?? ""),
  ];

  for (const run of tiers) {
    try {
      const result = await run();
      if (result?.email) {
        enrichCache.set(domain, { ...result, cachedAt: Date.now() });
        return result;
      }
    } catch (err) {
      console.warn("[enrichEmail] tier failed", err instanceof Error ? err.message : err);
    }
  }

  return { ...EMPTY };
}
