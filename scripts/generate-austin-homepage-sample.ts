/**
 * Regenerate public/sample/dentily-sample-austin.csv from live Austin pipeline output.
 *
 *   npx tsx --env-file=.env.local scripts/generate-austin-homepage-sample.ts
 *   WRITE_AUSTIN_SAMPLE=1 npx tsx --env-file=.env.local scripts/generate-austin-homepage-sample.ts
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildScoredLeads } from "@/lib/build-scored-leads";
import { batchEnrichLeads } from "@/lib/email-enrichment";
import {
  buildLeadPackCsv,
  buildLeadPackRowsFromExport,
  isLeadPackInstructionRow,
  type LeadPackCsvRow,
} from "@/lib/lead-pack-export";
import {
  leadToExportRow,
  PINNED_AUSTIN_HOMEPAGE_SAMPLE_NAMES,
  selectPinnedAustinHomepageSampleRows,
  validateHomepageSamplePack,
} from "@/lib/austin-homepage-sample";
import { getNicheConfig } from "@/lib/niches";
import { searchBusinesses } from "@/lib/google-places";
import { normalizePracticeDisplayName } from "@/lib/practice-name";
import { EMPTY_LEAD_ENRICHMENT, type Lead } from "@/lib/types";

const LOCATION = "Austin, TX";
const CACHE_DIR = join(process.cwd(), "scripts", ".cache");
const CACHE_JSON = join(CACHE_DIR, "austin-homepage-pipeline.json");
const OUT_CSV = join(process.cwd(), "public", "sample", "dentily-sample-austin.csv");

function printSampleTable(rows: LeadPackCsvRow[]): void {
  console.log("\n=== Selected 10 leads (preview) ===\n");
  for (const r of rows) {
    console.log(
      [
        r.name,
        `| ${r.priority}`,
        `| ${r.opportunity_type}`,
        `| score ${r.score}`,
        `| ${r.rating}★ / ${r.review_count} rev`,
        `| ${r.best_contact_method}`,
        `| email: ${r.primary_email || "—"}`,
        `| status: ${r.email_status}`,
      ].join(" ")
    );
    console.log(`  Why: ${r.why_this_lead}`);
    console.log(`  Addr: ${r.address}`);
    console.log("");
  }
}

async function appendMissingPinnedLeads(leads: Lead[]): Promise<Lead[]> {
  const have = new Set(leads.map((l) => normalizePracticeDisplayName(l.name).toLowerCase()));
  const out = [...leads];
  for (const pinned of PINNED_AUSTIN_HOMEPAGE_SAMPLE_NAMES) {
    const key = normalizePracticeDisplayName(pinned).toLowerCase();
    if (have.has(key)) continue;
    console.log(`[sample] pinned lead missing from pack, searching Places: ${pinned}`);
    const query =
      pinned === "South Austin Dental Implant Studio"
        ? "1221 W Ben White Blvd South Austin Dental Implant Studio Austin TX"
        : `${pinned} Austin TX`;
    const found = await searchBusinesses(query, 10);
    const match =
      found.find((p) => normalizePracticeDisplayName(p.name).toLowerCase() === key) ??
      found.find((p) => normalizePracticeDisplayName(p.name).toLowerCase().includes(key.slice(0, 20)));
    if (!match) throw new Error(`Places search could not resolve pinned lead: ${pinned}`);
    const [enriched] = await batchEnrichLeads([
      {
        placeId: match.placeId,
        name: match.name,
        niche: "Dentists",
        address: match.address,
        website: match.website,
        ...EMPTY_LEAD_ENRICHMENT,
        phone: match.phone,
        rating: match.rating,
        reviewCount: match.reviewCount,
        primaryType: match.primaryType,
        mapsUrl: match.mapsUrl,
        metadata: match.metadata ?? {},
        status: "new",
      },
    ]);
    out.push(enriched);
    have.add(normalizePracticeDisplayName(enriched.name).toLowerCase());
  }
  return out;
}

async function loadOrBuildEnrichedLeads(): Promise<Lead[]> {
  if (process.env.SKIP_PIPELINE === "1" && existsSync(CACHE_JSON)) {
    console.log(`[sample] SKIP_PIPELINE=1 loading ${CACHE_JSON}`);
    return JSON.parse(readFileSync(CACHE_JSON, "utf8")) as Lead[];
  }

  const nicheConfig = getNicheConfig("dentists");
  console.log("[sample] buildScoredLeads…");
  const scored = await buildScoredLeads({
    niche: nicheConfig.name,
    location: LOCATION,
    nicheConfig,
    subscriptionUserId: null,
    searchId: 0,
  });
  console.log(`[sample] scored ${scored.length} leads; enriching…`);
  const enriched = await batchEnrichLeads(scored, undefined, { hunterFallback: true });
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_JSON, JSON.stringify(enriched, null, 0), "utf8");
  console.log(`[sample] cached ${enriched.length} leads → ${CACHE_JSON}`);
  return enriched;
}

async function main(): Promise<void> {
  let enriched = await loadOrBuildEnrichedLeads();
  enriched = await appendMissingPinnedLeads(enriched);
  const exportRows = enriched.map((l) => leadToExportRow(l));
  const fullPack = buildLeadPackRowsFromExport(exportRows);
  const instruction = fullPack[0];
  if (!instruction || !isLeadPackInstructionRow(instruction)) {
    throw new Error("Missing instruction row from buildLeadPackRowsFromExport");
  }
  const dataRows = fullPack.slice(1).filter((r) => !isLeadPackInstructionRow(r));
  console.log(`[sample] full pack data rows: ${dataRows.length}`);

  const pinned = selectPinnedAustinHomepageSampleRows(dataRows);
  const [topLead, ...rest] = pinned;
  const ten = [
    { ...topLead, top_lead: "Yes" as const },
    ...rest.map((r) => ({ ...r, top_lead: "No" as const })),
  ];
  const pack = [instruction, ...ten];
  const validation = validateHomepageSamplePack(pack);
  console.log("\n[sample] validation:", validation.ok ? "PASS" : "FAIL", validation.issues);

  printSampleTable(ten);

  if (!validation.ok) {
    process.exitCode = 1;
    return;
  }

  if (process.env.WRITE_AUSTIN_SAMPLE === "1") {
    const csv = buildLeadPackCsv(pack);
    writeFileSync(OUT_CSV, `\uFEFF${csv}`, "utf8");
    console.log(`\n[sample] wrote ${OUT_CSV}\n`);
  } else {
    console.log("\n[sample] Dry run — set WRITE_AUSTIN_SAMPLE=1 to write the CSV.\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
