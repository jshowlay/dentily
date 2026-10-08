/**
 * Apply + verify pack_download_token on payments.
 *
 *   npx tsx --env-file=.env.local scripts/run-pack-download-token-migration.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sqlPath = join(process.cwd(), "scripts/migrate-pack-download-token.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log("[migrate] applying pack_download_token DDL…");
    await client.query(sql);

    const cols = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'payments'
         AND column_name = 'pack_download_token'`
    );
    const idx = await client.query(
      `SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'payments' AND indexname = 'payments_pack_download_token_key'`
    );

    const colOk = cols.rowCount === 1;
    const idxOk = idx.rowCount === 1;
    console.log("[migrate] payments.pack_download_token column:", colOk ? "OK" : "MISSING");
    console.log("[migrate] unique index:", idxOk ? "OK" : "MISSING");

    if (!colOk || !idxOk) {
      console.error("[migrate] verification failed");
      process.exit(1);
    }
    console.log("[migrate] verification passed");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
