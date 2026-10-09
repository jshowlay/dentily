/**
 * List corporate-chain clusters and unpaid top 10 for a search.
 * Usage: npx tsx --env-file=.env.local scripts/list-la-151-chain-clusters.ts [searchId]
 */
import { prepareLeadsForResultsClient } from "@/lib/results-lead-preview";
import { getSearchForResultsPage } from "@/lib/db";
import { buildLeadsMatchingExportPack } from "@/lib/lead-pack-export";
import {
  applyPackListingQualityRankAdjustments,
  buildPackListingContext,
  explainPackListingLabel,
  listCorporateChainClusters,
  marketCityFromSearchLocation,
} from "@/lib/pack-listing-quality";
import { resolveResultsContactDisplay } from "@/lib/contact-labels";

const searchId = Number(process.argv[2] ?? "151");

async function main() {
  const loaded = await getSearchForResultsPage(searchId);
  if (!loaded) {
    console.error(`Search ${searchId} not found`);
    process.exit(1);
  }
  const marketCity = marketCityFromSearchLocation(loaded.search.location);
  const leads = buildLeadsMatchingExportPack(loaded.exportRows);
  const ctx = buildPackListingContext(leads, marketCity);
  const ranked = applyPackListingQualityRankAdjustments(leads, marketCity);
  const clusters = listCorporateChainClusters(leads, marketCity);

  const corpCount = leads.filter(
    (l) => explainPackListingLabel(l, ctx, leads).label === "Corporate chain"
  ).length;
  console.log(
    `\nSearch #${searchId} (${loaded.search.location}) — ${corpCount} corporate-chain listing(s), ${clusters.length} cluster(s)\n`
  );
  for (const [i, c] of clusters.entries()) {
    console.log(`${i + 1}. ${c.clusterKey}`);
    console.log(`   Reason: ${c.reason}`);
    for (const p of c.practices) {
      console.log(`   • ${p.name}`);
    }
    console.log("");
  }

  const highland = leads.find((l) => l.name.includes("Dental Center of Highland Park"));
  if (highland) {
    const exp = explainPackListingLabel(highland, ctx, leads);
    console.log("Dental Center of Highland Park — listing label:", exp.label ?? "Independent");
    console.log("  Demotion reason:", exp.reason ?? "Not demoted (independent listing)");
    console.log("");
  }

  const unpaid = prepareLeadsForResultsClient(ranked, false);
  const clientByPlace = new Map(unpaid.leads.map((l) => [l.placeId, l]));
  console.log("Unpaid top 10 (after pack listing rank):\n");
  for (const [i, lead] of ranked.slice(0, 10).entries()) {
    const client = clientByPlace.get(lead.placeId) ?? lead;
    const exp = explainPackListingLabel(lead, ctx, leads);
    const sig = client.displaySignal
      ? `${client.displaySignal.icon} ${client.displaySignal.label}`
      : "—";
    const contact = resolveResultsContactDisplay(
      { primaryEmail: client.primaryEmail, contactFormUrl: client.contactFormUrl, phone: client.phone },
      { contactsLocked: true }
    );
    const contactStr = contact.kind === "locked" ? "🔒 In full pack" : contact.kind;
    console.log(
      `${i + 1}. ${lead.name} | score ${lead.score ?? "—"} | ${exp.label ?? "Independent"} | ${sig} | ${contactStr}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
