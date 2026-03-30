/**
 * Email / website enrichment tuning. Env overrides optional.
 *
 * Enrichment runs after scoring in `app/api/search/route.ts` (see `batchEnrichLeads`).
 * Fallback: when no valid email is found, we store a contact-form page URL when detectable.
 */

export type EmailEnrichmentRuntimeConfig = {
  requestTimeoutMs: number;
  maxInternalPages: number;
  concurrency: number;
  retryCount: number;
  politeDelayMs: number;
  userAgent: string;
};

const DEFAULTS: EmailEnrichmentRuntimeConfig = {
  requestTimeoutMs: 12_000,
  maxInternalPages: 3,
  concurrency: 3,
  retryCount: 2,
  politeDelayMs: 400,
  userAgent:
    "DentilyLeadBot/1.0 (+https://dentily.com; B2B practice research; polite crawl; contact for blocklist)",
};

function parseIntEnv(key: string, fallback: number): number {
  const v = process.env[key]?.trim();
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function isEmailEnrichmentDisabled(): boolean {
  const v = process.env.DENTILY_DISABLE_EMAIL_ENRICHMENT?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function loadEmailEnrichmentConfig(): EmailEnrichmentRuntimeConfig {
  return {
    requestTimeoutMs: parseIntEnv("DENTILY_ENRICH_TIMEOUT_MS", DEFAULTS.requestTimeoutMs),
    maxInternalPages: Math.min(8, Math.max(1, parseIntEnv("DENTILY_ENRICH_MAX_PAGES", DEFAULTS.maxInternalPages))),
    concurrency: Math.min(4, Math.max(1, parseIntEnv("DENTILY_ENRICH_CONCURRENCY", DEFAULTS.concurrency))),
    retryCount: Math.min(5, Math.max(0, parseIntEnv("DENTILY_ENRICH_RETRIES", DEFAULTS.retryCount))),
    politeDelayMs: parseIntEnv("DENTILY_ENRICH_DELAY_MS", DEFAULTS.politeDelayMs),
    userAgent: process.env.DENTILY_ENRICH_USER_AGENT?.trim() || DEFAULTS.userAgent,
  };
}

/**
 * `/api/search` runs in one browser request; deep per-site crawling for ~50 leads often exceeds
 * proxy/browser patience and surfaces as "Failed to fetch". These overrides keep enrichment useful
 * (homepage + one follow-up path) while finishing reliably. Opt into full crawl with
 * `DENTILY_FULL_SEARCH_ENRICHMENT=1` (may still need a long `maxDuration` on Vercel).
 */
export function enrichmentOverridesForSearchApi(): Partial<EmailEnrichmentRuntimeConfig> {
  if (isEmailEnrichmentDisabled()) return {};
  const full = process.env.DENTILY_FULL_SEARCH_ENRICHMENT?.trim().toLowerCase();
  if (full === "1" || full === "true" || full === "yes") return {};
  return {
    maxInternalPages: 1,
    retryCount: 1,
    requestTimeoutMs: Math.min(parseIntEnv("DENTILY_ENRICH_TIMEOUT_MS", 10_000), 10_000),
    politeDelayMs: 100,
    concurrency: 6,
  };
}
