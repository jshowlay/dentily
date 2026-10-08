/**
 * Print top 20 paid-pack leads for Austin (independent + evidence check).
 *
 *   npx tsx --env-file=.env.local scripts/show-austin-pack-top20.ts
 */
import { leadToExportRow } from "@/lib/austin-homepage-sample";
import { buildScoredLeads } from "@/lib/build-scored-leads";
import { buildLeadPackRowsFromExport, isLeadPackInstructionRow } from "@/lib/lead-pack-export";
import { getNicheConfig } from "@/lib/niches";
import {
  getPackListingLabelFromLead,
  isIndependentPackListing,
} from "@/lib/pack-listing-quality";
import { getLeadScoringEvidence, hasEvidenceBackedGap } from "@/lib/lead-scoring-evidence";

async function main() {
  const nicheConfig = getNicheConfig("dentists");
  const location = "Austin, TX";
  console.log(`[austin-top20] buildScoredLeads ${location}…`);
  const leads = await buildScoredLeads({
    niche: nicheConfig.name,
    location,
    nicheConfig,
    subscriptionUserId: null,
    searchId: 0,
  });

  const labeled = leads.filter((l) => !isIndependentPackListing(l));
  console.log(
    `[austin-top20] packSize=${leads.length} demotedLabeled=${labeled.length}`
  );
  if (labeled.length > 0) {
    console.log("Sample demoted rows:");
    for (const l of labeled.slice(0, 6)) {
      console.log(`  - ${l.name} | ${getPackListingLabelFromLead(l)} | score=${l.score}`);
    }
  }

  const top20 = leads.slice(0, 20);
  let issues = 0;

  console.log("\n=== Top 20 (search order after pack quality sort) ===\n");
  for (let i = 0; i < top20.length; i += 1) {
    const l = top20[i]!;
    const label = getPackListingLabelFromLead(l);
    const evidence = getLeadScoringEvidence(l);
    const gap = hasEvidenceBackedGap(evidence);
    const ok = isIndependentPackListing(l) && gap;
    if (!ok) issues += 1;
    const why =
      evidence?.gaps?.slice(0, 2).join(" | ") ||
      (l.reason ?? "").slice(0, 80) ||
      "—";
    console.log(
      `${String(i + 1).padStart(2, " ")}. ${l.name} | score=${l.score} | ${l.priority} | label=${label ?? "—"} | evidence=${gap ? "yes" : "no"}`
    );
    console.log(`    ${why}`);
  }

  const exportRows = top20.map(leadToExportRow);
  const pack = buildLeadPackRowsFromExport(exportRows).filter((r) => !isLeadPackInstructionRow(r));
  console.log("\n=== CSV listing_label (same 20) ===\n");
  pack.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name} | ${r.listing_label || "—"} | ${r.why_this_lead.slice(0, 100)}…`);
  });

  const labeledInTop = top20.filter((l) => !isIndependentPackListing(l)).length;
  const noGapInTop = top20.filter((l) => !hasEvidenceBackedGap(getLeadScoringEvidence(l))).length;
  console.log(
    `\n[austin-top20] labeledInTop=${labeledInTop} noEvidenceGapInTop=${noGapInTop} issues=${issues}`
  );
  if (labeledInTop > 0 || noGapInTop > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
