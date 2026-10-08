/**
 * Upper-bound timing for Stripe webhook CSV path (chain finalize + CSV build, no DB/email).
 *
 *   npx tsx --env-file=.env.local scripts/simulate-webhook-csv-timing.ts
 */
import { leadToExportRow } from "@/lib/austin-homepage-sample";
import { buildScoredLeads } from "@/lib/build-scored-leads";
import { buildLeadPackCsv, buildLeadPackRowsFromExport } from "@/lib/lead-pack-export";
import { finalizeDentistPackListingWithChainProbe } from "@/lib/pack-listing-quality";
import { getNicheConfig } from "@/lib/niches";

const WEBHOOK_LIMIT_MS = 300_000;

async function main() {
  const nicheConfig = getNicheConfig("dentists");
  const location = "Austin, TX";
  const t0 = Date.now();

  const leads = await buildScoredLeads({
    niche: nicheConfig.name,
    location,
    nicheConfig,
    subscriptionUserId: null,
    searchId: 0,
  });

  const tChain = Date.now();
  const { leads: finalized, chainProbeMs } = await finalizeDentistPackListingWithChainProbe(
    leads,
    location
  );
  const exportRows = finalized.map((l) => leadToExportRow(l));
  const packRows = buildLeadPackRowsFromExport(exportRows);
  const csv = buildLeadPackCsv(packRows);

  const totalMs = Date.now() - t0;
  console.log(
    `[webhook-csv-timing] leads=${leads.length} chainProbeMs=${chainProbeMs} csvBytes=${csv.length} totalMs=${totalMs} headroomMs=${WEBHOOK_LIMIT_MS - totalMs}`
  );
  if (totalMs > WEBHOOK_LIMIT_MS * 0.85) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
