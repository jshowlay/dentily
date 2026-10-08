/**
 *   npx tsx --env-file=.env.local scripts/run-admin-sample-austin.ts
 */
import { runAdminSampleMarket } from "@/lib/admin-sample-run";

async function main() {
const rows = await runAdminSampleMarket("Austin", "TX", 10);
for (let i = 0; i < rows.length; i += 1) {
  const r = rows[i]!;
  console.log(`\n--- ${i + 1}. ${r.name} ---`);
  console.log(`Score: ${r.score} | Tier: ${r.tier} | Opp: ${r.opportunityType}`);
  console.log(`Why: ${r.whyThisLead}`);
  console.log(`Email bullet: ${r.emailCopyReason}`);
  console.log(`Contact: ${r.bestContactMethod}`);
}

console.log("\n=== Summary table ===");
console.log(
  ["#", "Name", "Score", "Tier", "Opp"].join("\t")
);
rows.forEach((r, i) => {
  console.log([i + 1, r.name.slice(0, 40), r.score, r.tier, r.opportunityType].join("\t"));
});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
