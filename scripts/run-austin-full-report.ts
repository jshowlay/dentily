/**
 * Full Austin pipeline + post-run stats (no SKIP_PIPELINE).
 *
 *   npx tsx --env-file=.env.local scripts/run-austin-full-report.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildScoredLeads } from "@/lib/build-scored-leads";
import { batchEnrichLeads } from "@/lib/email-enrichment";
import { buildLeadPackRowsFromExport } from "@/lib/lead-pack-export";
import { leadToExportRow } from "@/lib/austin-homepage-sample";
import { getNicheConfig } from "@/lib/niches";
import { PRIORITY_SCORE_HIGH_MIN, PRIORITY_SCORE_MEDIUM_MIN } from "@/lib/lead-pipeline-config";
import { normalizePracticeDisplayName } from "@/lib/practice-name";

const LOCATION = "Austin, TX";
const CACHE_JSON = join(process.cwd(), "scripts", ".cache", "austin-homepage-pipeline.json");

function oppKey(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function contactBucket(r: { best_contact_method?: string | null }): string {
  const m = (r.best_contact_method ?? "").toLowerCase();
  if (m.includes("email") && !m.includes("no digital")) return "Email";
  if (m.includes("contact form")) return "Contact Form";
  if (m.includes("phone")) return "Phone only";
  return "?";
}

async function main(): Promise<void> {
  const nicheConfig = getNicheConfig("dentists");
  console.log("[report] buildScoredLeads…");
  const scored = await buildScoredLeads({
    niche: nicheConfig.name,
    location: LOCATION,
    nicheConfig,
    subscriptionUserId: null,
    searchId: 0,
  });
  console.log(`[report] scored ${scored.length}; enriching…`);
  const enriched = await batchEnrichLeads(scored, undefined, { hunterFallback: true });

  const corrected = enriched.filter((l) =>
    (l.enrichmentNotes ?? "").includes("Website corrected")
  );
  console.log("\n=== Website corrected ===");
  console.log("count:", corrected.length);
  for (const l of corrected) {
    console.log(
      `- ${l.name} | email=${l.primaryEmail ?? "—"} | notes=${l.enrichmentNotes?.slice(0, 120)}`
    );
  }

  const dentist = enriched.find(
    (l) => normalizePracticeDisplayName(l.name).toLowerCase() === "dentist in austin"
  );
  console.log("\n=== Dentist in Austin ===");
  if (dentist) {
    console.log({
      website: dentist.website,
      phone: dentist.phone,
      email: dentist.primaryEmail,
      status: dentist.emailStatus,
      notes: dentist.enrichmentNotes,
    });
  } else {
    console.log("not in pack");
  }

  const exportRows = enriched.map((l) => leadToExportRow(l));
  const packRows = buildLeadPackRowsFromExport(exportRows).filter(
    (r) => r.name && !r.name.startsWith("---")
  );

  const own = { Independent: 0, "Likely DSO": 0, Unknown: 0, "": 0 };
  for (const r of packRows) {
    const k = (r.ownership ?? "") as keyof typeof own;
    own[k] = (own[k] ?? 0) + 1;
  }
  console.log("\n=== Ownership ===");
  console.log(own);

  const rep = packRows.filter((r) => oppKey(r.opportunity_type) === "reputation_gap");
  console.log("\n=== Reputation Gap (n=" + rep.length + ") ===");
  const cm = { Email: 0, "Contact Form": 0, "Phone only": 0 };
  const cross = new Map<string, number>();
  for (const r of rep) {
    const c = contactBucket(r);
    cm[c as keyof typeof cm] = (cm[c as keyof typeof cm] ?? 0) + 1;
    const k = `${r.ownership} / ${c}`;
    cross.set(k, (cross.get(k) ?? 0) + 1);
  }
  console.log("By Best Contact Method:", cm);
  console.log("Cross-tab:");
  for (const [k, v] of [...cross.entries()].sort()) console.log(" ", k + ":", v);

  const scores = packRows.map((r) => Number(r.score)).filter((n) => Number.isFinite(n));
  const hist = new Map<number, number>();
  for (const s of scores) hist.set(s, (hist.get(s) ?? 0) + 1);
  const sortedScores = [...hist.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const s of scores) {
    if (s >= PRIORITY_SCORE_HIGH_MIN) high += 1;
    else if (s >= PRIORITY_SCORE_MEDIUM_MIN) medium += 1;
    else low += 1;
  }
  console.log("\n=== Score distribution ===");
  console.log(`High (≥${PRIORITY_SCORE_HIGH_MIN}): ${high}`);
  console.log(`Medium (${PRIORITY_SCORE_MEDIUM_MIN}–${PRIORITY_SCORE_HIGH_MIN - 1}): ${medium}`);
  console.log(`Low (<${PRIORITY_SCORE_MEDIUM_MIN}): ${low}`);
  console.log("Top score buckets:");
  for (const [score, count] of sortedScores.slice(0, 12)) {
    console.log(`  score ${score}: ${count} rows`);
  }
  const inBand = scores.filter((s) => s >= PRIORITY_SCORE_MEDIUM_MIN && s < PRIORITY_SCORE_HIGH_MIN).length;
  console.log(`Scores in ${PRIORITY_SCORE_MEDIUM_MIN}–${PRIORITY_SCORE_HIGH_MIN - 1} band: ${inBand}/${scores.length}`);

  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(join(process.cwd(), "scripts", ".cache"), { recursive: true });
  writeFileSync(CACHE_JSON, JSON.stringify(enriched, null, 0), "utf8");
  console.log(`\n[report] cached → ${CACHE_JSON}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
