import { ensureSchema, getPool, getSearchMetadata, mergeSearchMetadata } from "@/lib/db";

export const SEARCH_PAID_ENRICHMENT_AT_KEY = "paid_enrichment_completed_at";
export const SEARCH_PAID_ENRICHMENT_IN_PROGRESS_KEY = "paid_enrichment_in_progress_at";

const STALE_CLAIM_MS = 20 * 60 * 1000;
const DEFAULT_WAIT_MS = 10 * 60 * 1000;
const POLL_MS = 2_000;

function parseIso(raw: unknown): number | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

export function isPaidEnrichmentComplete(meta: Record<string, unknown>): boolean {
  return parseIso(meta[SEARCH_PAID_ENRICHMENT_AT_KEY]) !== null;
}

export function isPaidEnrichmentInProgress(meta: Record<string, unknown>, now = Date.now()): boolean {
  const t = parseIso(meta[SEARCH_PAID_ENRICHMENT_IN_PROGRESS_KEY]);
  if (t === null) return false;
  return now - t < STALE_CLAIM_MS;
}

/** True when paid enrich finished and chain probe has run (CSV-safe). */
export async function isPaidPackExportReady(searchId: number): Promise<boolean> {
  const { isPackChainProbeFinalized } = await import("@/lib/ensure-pack-chain-finalized");
  const meta = await getSearchMetadata(searchId);
  return isPaidEnrichmentComplete(meta) && isPackChainProbeFinalized(meta);
}

export type PaidEnrichmentAcquireResult = "run" | "wait" | "skip";

export async function acquirePaidEnrichmentRun(searchId: number): Promise<PaidEnrichmentAcquireResult> {
  await ensureSchema();
  const meta = await getSearchMetadata(searchId);
  if (isPaidEnrichmentComplete(meta)) return "skip";
  if (isPaidEnrichmentInProgress(meta)) return "wait";

  const client = await getPool().connect();
  try {
    const res = await client.query(
      `UPDATE searches
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object($2::text, to_jsonb(NOW()::text))
       WHERE id = $1
         AND (metadata->>$3) IS NULL
         AND (
           metadata->>$2 IS NULL
           OR (metadata->>$2)::timestamptz < NOW() - INTERVAL '20 minutes'
         )
       RETURNING id`,
      [searchId, SEARCH_PAID_ENRICHMENT_IN_PROGRESS_KEY, SEARCH_PAID_ENRICHMENT_AT_KEY]
    );
    if ((res.rowCount ?? 0) > 0) return "run";
  } finally {
    client.release();
  }

  const again = await getSearchMetadata(searchId);
  if (isPaidEnrichmentComplete(again)) return "skip";
  return "wait";
}

export async function markPaidEnrichmentComplete(searchId: number): Promise<void> {
  await mergeSearchMetadata(searchId, {
    [SEARCH_PAID_ENRICHMENT_AT_KEY]: new Date().toISOString(),
    [SEARCH_PAID_ENRICHMENT_IN_PROGRESS_KEY]: null,
  });
}

export async function releasePaidEnrichmentClaim(searchId: number): Promise<void> {
  await mergeSearchMetadata(searchId, {
    [SEARCH_PAID_ENRICHMENT_IN_PROGRESS_KEY]: null,
  });
}

export async function waitForPaidEnrichmentComplete(
  searchId: number,
  maxWaitMs = DEFAULT_WAIT_MS
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const meta = await getSearchMetadata(searchId);
    if (isPaidEnrichmentComplete(meta)) return true;
    if (!isPaidEnrichmentInProgress(meta)) {
      return false;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return isPaidEnrichmentComplete(await getSearchMetadata(searchId));
}
