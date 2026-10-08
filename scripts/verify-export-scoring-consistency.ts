/**
 * Compare results-page scores/reasons vs CSV export pipeline for 5 leads.
 *
 *   npx tsx --env-file=.env.local scripts/verify-export-scoring-consistency.ts
 */
import { leadToExportRow } from "@/lib/austin-homepage-sample";
import { buildScoredLeads } from "@/lib/build-scored-leads";
import { buildLeadPackRowsFromExport } from "@/lib/lead-pack-export";
import { getNicheConfig } from "@/lib/niches";

async function main() {
  const nicheConfig = getNicheConfig("dentists");
  const location = "Austin, TX";
  console.log("[verify-export] buildScoredLeads…");
  const leads = await buildScoredLeads({
    niche: nicheConfig.name,
    location,
    nicheConfig,
    subscriptionUserId: null,
    searchId: 0,
    scoringEvidenceOptions: { expensiveCandidateLimit: 20 },
  });
  const top5 = leads.slice(0, 5);
  const exportRows = top5.map((l) => leadToExportRow(l));
  const packRows = buildLeadPackRowsFromExport(exportRows).filter(
    (r) => r.name !== "--- HOW TO USE THIS PACK ---"
  );

  let mismatches = 0;
  for (let i = 0; i < top5.length; i += 1) {
    const lead = top5[i]!;
    const pack = packRows.find((p) => p.name === lead.name);
    if (!pack) {
      console.log(`MISSING pack row for ${lead.name}`);
      mismatches += 1;
      continue;
    }
    const scoreOk = String(lead.score ?? "") === String(pack.score ?? "");
    const reasonOk = (lead.reason ?? "").trim() === (pack.reason ?? "").trim();
    const priOk =
      (lead.priority ?? "").toLowerCase() === (pack.priority ?? "").toLowerCase();
    console.log(`\n${i + 1}. ${lead.name}`);
    console.log(`  score: results=${lead.score} csv=${pack.score} ${scoreOk ? "OK" : "MISMATCH"}`);
    console.log(`  priority: results=${lead.priority} csv=${pack.priority} ${priOk ? "OK" : "MISMATCH"}`);
    console.log(`  reason: ${reasonOk ? "OK" : "MISMATCH"}`);
    if (!scoreOk || !reasonOk || !priOk) mismatches += 1;
  }
  console.log(`\n[verify-export] done mismatches=${mismatches}`);
  if (mismatches > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
