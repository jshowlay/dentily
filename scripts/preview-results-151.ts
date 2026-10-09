/**
 * Compare unpaid vs buyer /results payload for a search (top 10 table rows).
 * Usage: npx tsx --env-file=.env.local scripts/preview-results-151.ts [searchId]
 */
import {
  applyPackListingQualityRankAdjustments,
  getPackListingLabelFromLead,
  marketCityFromSearchLocation,
} from "@/lib/pack-listing-quality";
import { resolveResultsContactDisplay } from "@/lib/contact-labels";
import { getSearchForResultsPage } from "@/lib/db";
import { buildLeadsMatchingExportPack } from "@/lib/lead-pack-export";
import {
  canViewFullLeadPackOnResults,
  prepareLeadsForResultsClient,
} from "@/lib/results-lead-preview";

const searchId = Number(process.argv[2] ?? "151");

function scanContactFields(leads: ReturnType<typeof prepareLeadsForResultsClient>["leads"]): string[] {
  const hits: string[] = [];
  for (const l of leads) {
    if (l.primaryEmail?.trim()) hits.push(`primaryEmail on ${l.name}`);
    if (l.phone?.trim()) hits.push(`phone on ${l.name}`);
    if (l.website?.trim()) hits.push(`website on ${l.name}`);
    if (l.contactFormUrl?.trim()) hits.push(`contactFormUrl on ${l.name}`);
  }
  return hits;
}

function printTop10(
  label: string,
  hasBuyerAccess: boolean,
  leads: ReturnType<typeof prepareLeadsForResultsClient>,
  ranked: ReturnType<typeof applyPackListingQualityRankAdjustments>
) {
  console.log(`\n=== ${label} (hasBuyerAccess=${hasBuyerAccess}) ===`);
  console.log(`signal types: ${leads.signalTypeCount}`);
  const pii = scanContactFields(leads.leads);
  console.log(`Contact-field scan: ${pii.length ? pii.join("; ") : "clean"}`);

  const clientByPlace = new Map(leads.leads.map((l) => [l.placeId, l]));
  for (const [i, lead] of ranked.slice(0, 10).entries()) {
    const client = clientByPlace.get(lead.placeId) ?? lead;
    const contact = resolveResultsContactDisplay(
      {
        primaryEmail: client.primaryEmail,
        contactFormUrl: client.contactFormUrl,
        phone: client.phone,
      },
      { contactsLocked: !hasBuyerAccess }
    );
    const contactStr =
      contact.kind === "locked"
        ? "🔒 In full pack"
        : contact.kind === "empty"
          ? "None"
          : contact.label;
    const sig = client.displaySignal
      ? `${client.displaySignal.icon} ${client.displaySignal.label}`
      : "—";
    const listing = getPackListingLabelFromLead(lead);
    console.log(
      `${i + 1}. ${lead.name} | score ${lead.score ?? "—"} | ${listing ?? "Independent"} | signal: ${sig} | contact: ${contactStr}`
    );
  }
}

async function main() {
  const loaded = await getSearchForResultsPage(searchId);
  if (!loaded) {
    console.error(`Search ${searchId} not found`);
    process.exit(1);
  }
  const displayLeads = buildLeadsMatchingExportPack(loaded.exportRows);
  console.log(
    `Search #${searchId} ${loaded.search.location} | paid=${loaded.search.isPaid} | rows=${displayLeads.length}`
  );

  const unpaidAccess = canViewFullLeadPackOnResults(loaded.search.isPaid, {
    allowed: false,
    message: "n",
  });
  const marketCity = marketCityFromSearchLocation(loaded.search.location);
  const ranked = applyPackListingQualityRankAdjustments(displayLeads, marketCity);
  const unpaidPayload = prepareLeadsForResultsClient(ranked, unpaidAccess);
  const buyerPayload = prepareLeadsForResultsClient(ranked, true);
  printTop10("Unpaid visitor", unpaidAccess, unpaidPayload, ranked);
  printTop10(
    loaded.search.isPaid ? "Buyer (paid + session)" : "Buyer (simulated after purchase)",
    true,
    buyerPayload,
    ranked
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
