import {
  getSearchWithLeads,
  markPendingLeadsEnrichmentSkipped,
  updateLeadsEnrichmentForSearch,
} from "@/lib/db";
import {
  batchEnrichLeads,
  runDeepEnrichment,
  runHunterFallback,
} from "@/lib/email-enrichment";
import { backgroundEnrichmentOverrides, isEmailEnrichmentDisabled } from "@/lib/email-enrichment-config";
import {
  acquirePaidEnrichmentRun,
  markPaidEnrichmentComplete,
  releasePaidEnrichmentClaim,
  waitForPaidEnrichmentComplete,
} from "@/lib/paid-pack-enrichment-lock";
import type { Lead } from "@/lib/types";

const ENRICH_CHUNK_SIZE = 15;

export type SearchEnrichmentTier = "preview" | "paid";

export type SearchEnrichmentStats = {
  tier: SearchEnrichmentTier;
  crawled: number;
  hunterAdded: number;
  deepAdded: number;
  withEmail: number;
  durationMs: number;
  skipped?: boolean;
};

function parseCityState(location: string): { city: string; state: string } {
  const parts = (location ?? "").split(",").map((p) => p.trim());
  return { city: parts[0] ?? "", state: parts[1] ?? "" };
}

async function crawlPendingLeads(searchId: number, search: NonNullable<Awaited<ReturnType<typeof getSearchWithLeads>>>): Promise<{
  crawled: Lead[];
  pendingCount: number;
}> {
  const pendingAll = search.leads.filter((l) => l.emailStatus === "pending");
  const pendingNoWebsite = pendingAll.filter((l) => !(l.website ?? "").trim());
  const pending = pendingAll.filter((l) => (l.website ?? "").trim());

  if (pendingNoWebsite.length > 0) {
    await markPendingLeadsEnrichmentSkipped(
      searchId,
      pendingNoWebsite.map((l) => l.placeId),
      "No website on listing — use phone or Maps for outreach."
    );
  }

  if (isEmailEnrichmentDisabled()) {
    if (pending.length > 0) {
      await markPendingLeadsEnrichmentSkipped(
        searchId,
        pending.map((l) => l.placeId),
        "Website email enrichment disabled — use phone, contact form (if listed), and Maps."
      );
    }
    return { crawled: search.leads, pendingCount: 0 };
  }

  const overrides = backgroundEnrichmentOverrides();
  const crawlOpts = { hunterFallback: false, skipWebsiteDiscovery: true } as const;

  let crawled: Lead[] = [];
  if (pending.length > 0) {
    for (let i = 0; i < pending.length; i += ENRICH_CHUNK_SIZE) {
      const chunk = pending.slice(i, i + ENRICH_CHUNK_SIZE);
      const enrichedChunk = await batchEnrichLeads(chunk, overrides, crawlOpts);
      await updateLeadsEnrichmentForSearch(searchId, enrichedChunk);
      crawled.push(...enrichedChunk);
    }
  } else {
    crawled = search.leads;
  }

  return { crawled, pendingCount: pending.length };
}

/** Hunter + deep paid providers. Caller must hold the paid enrichment claim. */
export async function runSearchPackEnrichmentPaidWork(searchId: number): Promise<SearchEnrichmentStats> {
  const t0 = Date.now();
  const search = await getSearchWithLeads(searchId);
  if (!search) {
    await releasePaidEnrichmentClaim(searchId);
    return {
      tier: "paid",
      crawled: 0,
      hunterAdded: 0,
      deepAdded: 0,
      withEmail: 0,
      durationMs: Date.now() - t0,
    };
  }

  try {
    const { crawled, pendingCount } = await crawlPendingLeads(searchId, search);
    const refreshed = await getSearchWithLeads(searchId);
    const baseLeads = refreshed?.leads ?? crawled;

    const hunted = await runHunterFallback(baseLeads);
    const hunterChanged = hunted.filter((lead, idx) => lead.primaryEmail !== baseLeads[idx]?.primaryEmail);
    if (hunterChanged.length > 0) {
      await updateLeadsEnrichmentForSearch(searchId, hunterChanged);
    }

    const { city, state } = parseCityState(search.location);
    const deepened = await runDeepEnrichment(hunted, { city, state }, { paidProviders: true });
    const deepChanged = deepened.filter((lead, idx) => lead.primaryEmail !== hunted[idx]?.primaryEmail);
    if (deepChanged.length > 0) {
      await updateLeadsEnrichmentForSearch(searchId, deepChanged);
    }

    const withEmail = deepened.filter((l) => (l.primaryEmail ?? "").trim()).length;
    await markPaidEnrichmentComplete(searchId);

    return {
      tier: "paid",
      crawled: pendingCount,
      hunterAdded: hunterChanged.length,
      deepAdded: deepChanged.length,
      withEmail,
      durationMs: Date.now() - t0,
    };
  } catch (e) {
    await releasePaidEnrichmentClaim(searchId);
    throw e;
  }
}

async function runPaidTierWithLock(searchId: number): Promise<SearchEnrichmentStats> {
  const t0 = Date.now();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const gate = await acquirePaidEnrichmentRun(searchId);
    if (gate === "skip") {
      const latest = await getSearchWithLeads(searchId);
      const withEmail = latest?.leads.filter((l) => (l.primaryEmail ?? "").trim()).length ?? 0;
      return {
        tier: "paid",
        crawled: 0,
        hunterAdded: 0,
        deepAdded: 0,
        withEmail,
        durationMs: Date.now() - t0,
        skipped: true,
      };
    }
    if (gate === "wait") {
      const ok = await waitForPaidEnrichmentComplete(searchId, 8 * 60 * 1000);
      if (ok) {
        const latest = await getSearchWithLeads(searchId);
        const withEmail = latest?.leads.filter((l) => (l.primaryEmail ?? "").trim()).length ?? 0;
        return {
          tier: "paid",
          crawled: 0,
          hunterAdded: 0,
          deepAdded: 0,
          withEmail,
          durationMs: Date.now() - t0,
          skipped: true,
        };
      }
      continue;
    }
    return runSearchPackEnrichmentPaidWork(searchId);
  }

  return {
    tier: "paid",
    crawled: 0,
    hunterAdded: 0,
    deepAdded: 0,
    withEmail: 0,
    durationMs: Date.now() - t0,
    skipped: true,
  };
}

/**
 * Preview (unpaid /results): shallow website crawl only.
 * Paid: locked Hunter + deep enrich (single runner per search).
 */
export async function runSearchPackEnrichment(
  searchId: number,
  tier: SearchEnrichmentTier
): Promise<SearchEnrichmentStats> {
  const t0 = Date.now();
  if (tier === "paid") {
    return runPaidTierWithLock(searchId);
  }

  const search = await getSearchWithLeads(searchId);
  if (!search) {
    return {
      tier,
      crawled: 0,
      hunterAdded: 0,
      deepAdded: 0,
      withEmail: 0,
      durationMs: Date.now() - t0,
    };
  }

  const { crawled, pendingCount } = await crawlPendingLeads(searchId, search);
  const withEmail = crawled.filter((l) => (l.primaryEmail ?? "").trim()).length;
  return {
    tier,
    crawled: pendingCount,
    hunterAdded: 0,
    deepAdded: 0,
    withEmail,
    durationMs: Date.now() - t0,
  };
}
