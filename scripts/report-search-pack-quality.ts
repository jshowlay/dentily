/**
 * Quality report for a search export (before/after pipeline gates).
 * Usage: npx tsx --env-file=.env.local scripts/report-search-pack-quality.ts 148
 */
import { getSearchForExport } from "@/lib/db";
import {
  buildLeadPackRowsFromExport,
  isLeadPackInstructionRow,
  rejectOffDomainOrganizationEmail,
  sanitizeExportRowForEmailGate,
} from "@/lib/lead-pack-export";
import { collapseSamePracticeNameRows, dedupeExportLeadRows, type LeadPackDedupeMerge } from "@/lib/lead-pack-dedupe";
import { marketCityFromSearchLocation } from "@/lib/pack-listing-quality";
import { emailMailboxMatchesPracticeIdentity } from "@/lib/practice-email-gate";

const searchId = Number(process.argv[2] ?? "148");
if (!Number.isFinite(searchId)) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/report-search-pack-quality.ts <searchId>");
  process.exit(1);
}

async function main() {
  const { search, rows } = await getSearchForExport(searchId);
  if (!search) {
    console.error(`Search ${searchId} not found`);
    process.exit(1);
  }

  console.log(`\n=== Search #${searchId} — ${search.location} ===`);
  console.log(`Raw DB rows: ${rows.length}`);

  const marketCity = marketCityFromSearchLocation(search.location);
  const merges: LeadPackDedupeMerge[] = [];
  let staged = dedupeExportLeadRows(rows, { mergeLog: merges, marketCity });
  staged = collapseSamePracticeNameRows(staged, { mergeLog: merges, marketCity });
  const deduped = staged;

  const perioRow = rows.find((r) => (r.name ?? "").includes("Periodontal Health Specialists"));
  if (perioRow) {
    const topgum = "topgum@mindspring.com";
    const match = emailMailboxMatchesPracticeIdentity(topgum, perioRow.name);
    console.log(
      `\n--- topgum@mindspring.com vs "${perioRow.name}" ---\n  practice token match: ${match} (expect false → rejected at export)`
    );
  }

  console.log(`\n--- Dedupe merges (${merges.length}) ---`);
  if (merges.length === 0) {
    console.log("  (none)");
  } else {
    for (const m of merges) {
      console.log(`  • [${m.reason}] kept "${m.kept}" ← dropped "${m.dropped}"`);
    }
  }
  console.log(`\nAfter dedupe + same-name collapse: ${deduped.length} rows`);

  const gated = deduped.map(sanitizeExportRowForEmailGate).map(rejectOffDomainOrganizationEmail);
  const rejectSamples: string[] = [];
  for (let i = 0; i < deduped.length; i += 1) {
    const raw = (deduped[i]?.primary_email ?? "").trim();
    const after = (gated[i]?.primary_email ?? "").trim();
    if (raw && !after) {
      rejectSamples.push(`${deduped[i]?.name}: ${raw}`);
    }
  }
  console.log(`\nPrimary emails cleared by gates: ${rejectSamples.length}`);
  for (const line of rejectSamples) console.log(`  • ${line}`);

  const pack = buildLeadPackRowsFromExport(rows);
  const validEmails = pack.filter((r) => r.primary_email.trim().length > 0).length;
  const badFound = pack.filter(
    (r) => r.email_status.toLowerCase() === "found" && !r.primary_email.trim()
  );

  console.log("\n--- After full pack export ---");
  console.log(`  Total rows: ${pack.length}`);
  console.log(`  Valid primary emails: ${validEmails}`);
  console.log(`  Instruction rows: ${pack.filter((r) => isLeadPackInstructionRow(r)).length} (expect 0)`);
  console.log(`  email_status Found without primary: ${badFound.length} (expect 0)`);

  const labelCounts = new Map<string, number>();
  for (const r of pack) {
    const lab = r.listing_label.trim() || "(none)";
    labelCounts.set(lab, (labelCounts.get(lab) ?? 0) + 1);
  }
  console.log("\n--- Listing labels ---");
  for (const [lab, n] of Array.from(labelCounts.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lab}: ${n}`);
  }

  const watch = ["Small Smiles", "Tingey", "Rocky Mountain", "Terry Reilly", "Aspen"];
  console.log("\n--- Watched practices ---");
  for (const r of pack) {
    if (!watch.some((w) => r.name.includes(w))) continue;
    console.log(
      `  • ${r.name} | ${r.listing_label || "(none)"} | other_locations=${r.other_locations ? "yes" : "—"}`
    );
  }

  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
