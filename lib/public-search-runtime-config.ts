/**
 * Runtime caps for the blocking POST /api/search path (maxDuration on that route).
 * Admin sample overrides some of these via explicit options.
 */
export const PUBLIC_SEARCH_MAX_DURATION_SEC = 120;

/** Headroom target — log a warning in timing scripts when total ms exceeds this. */
export const PUBLIC_SEARCH_COMFORT_BUDGET_MS = 90_000;

/** Places chain probes during pack-quality pass (in-pack heuristics still run). */
export const PUBLIC_SEARCH_CHAIN_PROBE_MAX = 4;
export const PUBLIC_SEARCH_CHAIN_PROBE_TOP_SCORED = 15;

/** Independent leads that receive recency + website / PageSpeed evidence. */
export const PUBLIC_SEARCH_EVIDENCE_INDEPENDENT_LIMIT = 20;
