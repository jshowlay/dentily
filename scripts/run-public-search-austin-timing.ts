/**
 * Simulates blocking POST /api/search work for Austin (no HTTP).
 *
 *   npx tsx --env-file=.env.local scripts/run-public-search-austin-timing.ts
 */
import { buildScoredLeads } from "@/lib/build-scored-leads";
import { getNicheConfig } from "@/lib/niches";
import {
  PUBLIC_SEARCH_COMFORT_BUDGET_MS,
  PUBLIC_SEARCH_MAX_DURATION_SEC,
} from "@/lib/public-search-runtime-config";

async function main() {
  const nicheConfig = getNicheConfig("dentists");
  const location = "Austin, TX";
  const limitMs = PUBLIC_SEARCH_MAX_DURATION_SEC * 1000;

  console.log(
    `[public-search-timing] start niche=dentists location="${location}" vercelLimitSec=${PUBLIC_SEARCH_MAX_DURATION_SEC}`
  );
  const t0 = Date.now();

  const leads = await buildScoredLeads({
    niche: nicheConfig.name,
    location,
    nicheConfig,
    subscriptionUserId: null,
    searchId: 0,
  });

  const totalMs = Date.now() - t0;
  const headroomMs = limitMs - totalMs;
  console.log(
    `[public-search-timing] done leadCount=${leads.length} total ms=${totalMs} headroomMs=${headroomMs} comfortBudgetMs=${PUBLIC_SEARCH_COMFORT_BUDGET_MS}`
  );

  if (totalMs >= limitMs * 0.85) {
    console.error(
      `[public-search-timing] WARNING within 15% of ${PUBLIC_SEARCH_MAX_DURATION_SEC}s Vercel limit`
    );
    process.exit(1);
  }
  if (totalMs > PUBLIC_SEARCH_COMFORT_BUDGET_MS) {
    console.warn(`[public-search-timing] above comfort budget (${PUBLIC_SEARCH_COMFORT_BUDGET_MS}ms)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
