/**
 * Compare unpaid vs buyer /results payload for a search (top 10 table rows).
 * Usage: npx tsx --env-file=.env.local scripts/preview-results-151.ts [searchId]
 */
import { sortLeadsForPaidPack } from "@/lib/pack-listing-quality";
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

function printTop10(label: string, hasBuyerAccess: boolean, leads: ReturnType<typeof prepareLeadsForResultsClient>) {
  console.log(`\n=== ${label} (hasBuyerAccess=${hasBuyerAccess}) ===`);
  console.log(`signal types: ${leads.signalTypeCount}`);
  const pii = scanContactFields(leads.leads);
  console.log(`Contact-field scan: ${pii.length ? pii.join("; ") : "clean"}`);

  const sorted = sortLeadsForPaidPack([...leads.leads]);
  for (const [i, lead] of sorted.slice(0, 10).entries()) {
    const contact = resolveResultsContactDisplay(
      {
        primaryEmail: lead.primaryEmail,
        contactFormUrl: lead.contactFormUrl,
        phone: lead.phone,
      },
      { contactsLocked: !hasBuyerAccess }
    );
    const contactStr =
      contact.kind === "locked"
        ? "🔒 In full pack"
        : contact.kind === "empty"
          ? "None"
          : contact.label;
    const sig = lead.displaySignal ? `${lead.displaySignal.icon} ${lead.displaySignal.label}` : "—";
    console.log(
      `${i + 1}. ${lead.name} | score ${lead.score ?? "—"} | signal: ${sig} | contact: ${contactStr}`
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
  printTop10("Unpaid visitor", unpaidAccess, prepareLeadsForResultsClient(displayLeads, unpaidAccess));
  printTop10(
    loaded.search.isPaid ? "Buyer (paid + session)" : "Buyer (simulated after purchase)",
    true,
    prepareLeadsForResultsClient(displayLeads, true)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
