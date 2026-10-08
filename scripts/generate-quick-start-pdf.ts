/**
 * Generate a Quick Start PDF locally (same stats pipeline as buyer CSV).
 * Usage: npx tsx --env-file=.env.local scripts/generate-quick-start-pdf.ts 148 [outPath]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getSearchForExport } from "@/lib/db";
import { formatMarketLocation, marketLocationFilenamePart } from "@/lib/format-market-location";
import { computeQuickStartPackStatsFromExportRows } from "@/lib/pdf/quick-start-pack-stats";
import { renderQuickStartGuideBuffer } from "@/lib/pdf/render-quick-start-guide";

const searchId = Number(process.argv[2] ?? "148");
const outArg = process.argv[3];

async function main() {
  if (!Number.isFinite(searchId) || searchId <= 0) {
    console.error("Usage: npx tsx --env-file=.env.local scripts/generate-quick-start-pdf.ts <searchId> [outPath]");
    process.exit(1);
  }

  const { search, rows } = await getSearchForExport(searchId);
  if (!search) {
    console.error(`Search ${searchId} not found`);
    process.exit(1);
  }

  const market = formatMarketLocation(search.location) || search.location;
  const stats = computeQuickStartPackStatsFromExportRows(rows);
  const buffer = await renderQuickStartGuideBuffer({ market, ...stats });

  const defaultName = `dentily-${marketLocationFilenamePart(search.location)}-quick-start-${searchId}.pdf`;
  const outPath = outArg ?? join(process.cwd(), defaultName);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buffer);

  console.log(`\nWrote ${outPath} (${buffer.length} bytes)`);
  console.log(`Market: ${market}`);
  console.log("Stats (matches export CSV):");
  console.log(`  Total practices: ${stats.totalPractices}`);
  console.log(`  Email leads: ${stats.emailCount}`);
  console.log(`  Contact form: ${stats.formCount}`);
  console.log(`  Phone only: ${stats.phoneCount}`);
  console.log(`  Top priority: ${stats.topPriorityLeads}`);
  console.log(`  Contactable: ${stats.contactableLeads}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
