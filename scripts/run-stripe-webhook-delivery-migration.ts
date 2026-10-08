/**
 * Apply + verify Stripe webhook delivery schema on Neon/production.
 *
 *   npx tsx --env-file=.env.local scripts/run-stripe-webhook-delivery-migration.ts
 *
 * Uses DATABASE_URL (same as the app). Idempotent.
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

  const sqlPath = join(process.cwd(), "scripts/migrate-stripe-webhook-delivery.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log("[migrate] applying stripe webhook delivery DDL…");
    await client.query(sql);

    const table = await client.query(
      `SELECT to_regclass('public.stripe_webhook_events') AS reg`
    );
    const cols = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'payments'
         AND column_name IN (
           'pack_delivery_email_sent_at',
           'pack_delivery_in_progress_at'
         )
       ORDER BY column_name`
    );

    const tableOk = Boolean(table.rows[0]?.reg);
    const colNames = cols.rows.map((r) => r.column_name as string);
    console.log("[migrate] stripe_webhook_events table:", tableOk ? "OK" : "MISSING");
    console.log("[migrate] payments columns:", colNames.join(", ") || "(none)");

    if (!tableOk || colNames.length < 2) {
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
