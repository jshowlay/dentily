/**
 * Email / website enrichment tuning. Env overrides optional.
 *
 * Enrichment is optional and non-blocking: `/api/search` saves leads with `email_status=pending`,
 * then `POST /api/search/[id]/enrich` runs a shallow crawl in the background.
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

/** Non-negative integers (0 = homepage-only crawl). */
function parseIntEnvNonNeg(key: string, fallback: number): number {
  const v = process.env[key]?.trim();
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(8, n) : fallback;
}

export function isEmailEnrichmentDisabled(): boolean {
  const v = process.env.DENTILY_DISABLE_EMAIL_ENRICHMENT?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function loadEmailEnrichmentConfig(): EmailEnrichmentRuntimeConfig {
  return {
    requestTimeoutMs: parseIntEnv("DENTILY_ENRICH_TIMEOUT_MS", DEFAULTS.requestTimeoutMs),
    maxInternalPages: parseIntEnvNonNeg("DENTILY_ENRICH_MAX_PAGES", DEFAULTS.maxInternalPages),
    concurrency: Math.min(8, Math.max(1, parseIntEnv("DENTILY_ENRICH_CONCURRENCY", DEFAULTS.concurrency))),
    retryCount: Math.min(5, Math.max(0, parseIntEnvNonNeg("DENTILY_ENRICH_RETRIES", DEFAULTS.retryCount))),
    politeDelayMs: parseIntEnvNonNeg("DENTILY_ENRICH_DELAY_MS", DEFAULTS.politeDelayMs),
    userAgent: process.env.DENTILY_ENRICH_USER_AGENT?.trim() || DEFAULTS.userAgent,
  };
}

/**
 * Background enrich pass: homepage by default; set DENTILY_ENRICH_EXTRA_PAGES=1 to allow one
 * likely contact page. Hard caps on timeout/retries; no deep crawl.
 * DENTILY_FULL_ENRICHMENT=1 restores deeper crawl (max pages from env, up to 8).
 */
export function backgroundEnrichmentOverrides(): Partial<EmailEnrichmentRuntimeConfig> {
  if (isEmailEnrichmentDisabled()) return {};
  const full = process.env.DENTILY_FULL_ENRICHMENT?.trim().toLowerCase();
  if (full === "1" || full === "true" || full === "yes") {
    return {
      retryCount: Math.min(2, parseIntEnvNonNeg("DENTILY_ENRICH_RETRIES", 2)),
      requestTimeoutMs: Math.min(12_000, parseIntEnv("DENTILY_ENRICH_TIMEOUT_MS", 12_000)),
      politeDelayMs: 150,
      concurrency: 5,
    };
  }
  const extraPages = parseIntEnvNonNeg("DENTILY_ENRICH_EXTRA_PAGES", 0);
  return {
    maxInternalPages: Math.min(1, extraPages),
    retryCount: 1,
    requestTimeoutMs: Math.min(8_000, parseIntEnv("DENTILY_ENRICH_TIMEOUT_MS", 8_000)),
    politeDelayMs: 80,
    concurrency: 8,
  };
}
