/**
 * Worst-case paid delivery timing for Austin (paid enrich → chain → CSV; email mocked).
 *
 *   PACK_TIMING_SEARCH_ID=123 npx tsx --env-file=.env.local scripts/time-austin-paid-delivery.ts
 *   FORCE_FULL=1  — clears paid enrich + chain metadata on that search first
 */
import pg from "pg";
import { buildPackCsvAttachment } from "@/lib/build-pack-csv-for-search";
import { ensureSchema, getPool, mergeSearchMetadata } from "@/lib/db";
import { SEARCH_PACK_CHAIN_FINALIZED_AT_KEY } from "@/lib/pack-listing-quality";
import {
  SEARCH_PAID_ENRICHMENT_AT_KEY,
  SEARCH_PAID_ENRICHMENT_IN_PROGRESS_KEY,
} from "@/lib/paid-pack-enrichment-lock";

const WEBHOOK_BUDGET_MS = 300_000;

async function resolveAustinSearchId(client: pg.PoolClient): Promise<number> {
  const fromEnv = process.env.PACK_TIMING_SEARCH_ID?.trim();
  if (fromEnv) {
    const id = Number(fromEnv);
    if (Number.isFinite(id) && id > 0) return id;
  }

  const res = await client.query<{ id: number }>(
    `SELECT id FROM searches
     WHERE is_paid = true AND location ILIKE '%Austin%'
     ORDER BY created_at DESC
     LIMIT 1`
  );
  const id = res.rows[0]?.id;
  if (!id) {
    throw new Error("No paid Austin search found. Set PACK_TIMING_SEARCH_ID to a paid Austin search.");
  }
  return id;
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  await ensureSchema();
  const pool = getPool();
  const client = await pool.connect();

  let searchId: number;
  try {
    searchId = await resolveAustinSearchId(client);
    const loc = await client.query(`SELECT location, result_count FROM searches WHERE id = $1`, [searchId]);
    console.log("[timing] searchId=", searchId, "location=", loc.rows[0]?.location, "rows=", loc.rows[0]?.result_count);

    if (process.env.FORCE_FULL === "1") {
      await mergeSearchMetadata(searchId, {
        [SEARCH_PAID_ENRICHMENT_AT_KEY]: null,
        [SEARCH_PAID_ENRICHMENT_IN_PROGRESS_KEY]: null,
        [SEARCH_PACK_CHAIN_FINALIZED_AT_KEY]: null,
      });
      console.log("[timing] cleared paid enrich + chain metadata (FORCE_FULL=1)");
    }
  } finally {
    client.release();
  }

  const t0 = Date.now();
  let built: Awaited<ReturnType<typeof buildPackCsvAttachment>> = null;
  let err: unknown = null;
  try {
    built = await buildPackCsvAttachment(searchId);
  } catch (e) {
    err = e;
  }
  const pipelineMs = Date.now() - t0;
  const emailMockMs = 2500;
  const totalMs = pipelineMs + emailMockMs;

  console.log("\n=== Austin paid delivery timing ===");
  console.log("(see [build-pack-csv] logs above for enrichMs / chainMs breakdown)");
  console.log("pipeline (paid enrich + chain + CSV):", `${pipelineMs} ms (${(pipelineMs / 1000).toFixed(1)} s)`);
  console.log("email send (Resend, estimated):", `${emailMockMs} ms`);
  console.log("estimated total:", `${totalMs} ms (${(totalMs / 1000).toFixed(1)} s)`);
  console.log("csv bytes:", built?.buffer.length ?? 0);
  console.log("webhook maxDuration budget:", `${WEBHOOK_BUDGET_MS} ms (${WEBHOOK_BUDGET_MS / 1000}s)`);
  console.log("headroom vs budget:", `${WEBHOOK_BUDGET_MS - totalMs} ms`);
  if (err) {
    console.warn("[timing] CSV step error after pipeline (often Neon idle disconnect):", err);
  }
  if (totalMs > WEBHOOK_BUDGET_MS * 0.9) {
    console.warn("[timing] WARNING: within 10% of 300s webhook budget");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
