/**
 * Preview outreach drafts + signal labels for a paid search export.
 * Usage: npx tsx --env-file=.env.local scripts/preview-boise-148-outreach.ts [searchId]
 */
import { signalDisplayForLead } from "@/components/results/results-utils";
import { getSearchForExport } from "@/lib/db";
import { classifyOutreachDraftStyle } from "@/lib/outreach-draft";
import {
  buildLeadPackRowsFromExport,
  buildLeadsMatchingExportPack,
} from "@/lib/lead-pack-export";
import { OUTREACH_SOFT_QUESTION_CTAS } from "@/lib/outreach-cta";
import { cityLabelFromLocation } from "@/lib/search-submit-progress";

const searchId = Number(process.argv[2] ?? "148");

async function main() {
  const { search, rows } = await getSearchForExport(searchId);
  if (!search) {
    console.error(`Search ${searchId} not found`);
    process.exit(1);
  }
  const marketCity = cityLabelFromLocation(search.location);
  const pack = buildLeadPackRowsFromExport(rows);
  const leads = buildLeadsMatchingExportPack(rows);

  const styles = new Set<string>();
  const samples: typeof pack = [];

  for (const row of pack) {
    const lead = leads.find((l) => l.name === row.name);
    if (!lead) continue;
    const style = classifyOutreachDraftStyle(lead, { marketCity });
    if (samples.length < 5 && !styles.has(style)) {
      styles.add(style);
      samples.push(row);
    }
  }

  const consecutiveCtaCheck = pack.slice(0, 15).map((r) => {
    const cta = OUTREACH_SOFT_QUESTION_CTAS.find((c) => r.outreach_draft.includes(c));
    return cta ?? "(hiring/other)";
  });
  let consecutiveDupes = 0;
  for (let i = 1; i < consecutiveCtaCheck.length; i += 1) {
    if (consecutiveCtaCheck[i] === consecutiveCtaCheck[i - 1] && consecutiveCtaCheck[i] !== "(hiring/other)") {
      consecutiveDupes += 1;
    }
  }

  console.log(`\n=== Search #${searchId} — ${search.location} (market: ${marketCity}) ===`);
  console.log(`Pack rows: ${pack.length}\n`);

  console.log("--- 5 sample drafts (distinct styles) ---\n");
  for (const row of samples) {
    const lead = leads.find((l) => l.name === row.name)!;
    const style = classifyOutreachDraftStyle(lead, { marketCity });
    const words = row.outreach_draft.split(/\s+/).filter(Boolean).length;
    console.log(`【${style}】 ${row.name}`);
    console.log(`Subject: ${row.subject_line}`);
    console.log(`Words: ${words}`);
    console.log(row.outreach_draft);
    console.log("\n---\n");
  }

  const labelCounts = new Map<string, number>();
  let hidden = 0;
  for (const lead of leads) {
    const sig = signalDisplayForLead(lead);
    if (!sig) {
      hidden += 1;
      continue;
    }
    const key = `${sig.icon} ${sig.label}`;
    labelCounts.set(key, (labelCounts.get(key) ?? 0) + 1);
  }

  console.log("--- Signal labels on results table ---");
  for (const [lab, n] of Array.from(labelCounts.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lab}: ${n}`);
  }
  console.log(`  (hidden / no evidence): ${hidden}`);
  console.log(`\nConsecutive duplicate CTAs in top 15 rows: ${consecutiveDupes} (expect 0)`);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
