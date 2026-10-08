import {
  getSearchMetadata,
  getSearchWithLeads,
  markPendingLeadsEnrichmentSkipped,
  mergeSearchMetadata,
  updateLeadsEnrichmentForSearch,
} from "@/lib/db";
import {
  batchEnrichLeads,
  runDeepEnrichment,
  runHunterFallback,
} from "@/lib/email-enrichment";
import { backgroundEnrichmentOverrides, isEmailEnrichmentDisabled } from "@/lib/email-enrichment-config";
import type { Lead } from "@/lib/types";

const ENRICH_CHUNK_SIZE = 15;

export const SEARCH_PAID_ENRICHMENT_AT_KEY = "paid_enrichment_completed_at";

export type SearchEnrichmentTier = "preview" | "paid";

export type SearchEnrichmentStats = {
  tier: SearchEnrichmentTier;
  crawled: number;
  hunterAdded: number;
  deepAdded: number;
  withEmail: number;
  durationMs: number;
};

function parseCityState(location: string): { city: string; state: string } {
  const parts = (location ?? "").split(",").map((p) => p.trim());
  return { city: parts[0] ?? "", state: parts[1] ?? "" };
}

/**
 * Preview (unpaid /results): shallow website crawl only — no Hunter discover, domain search,
 * ZeroBounce, Apollo, or Prospeo.
 *
 * Paid (post-checkout delivery or authorized enrich): crawl remaining pending leads, then Hunter
 * fallback + deep tiers for rows still missing email.
 */
export async function runSearchPackEnrichment(
  searchId: number,
  tier: SearchEnrichmentTier
): Promise<SearchEnrichmentStats> {
  const t0 = Date.now();
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
    return {
      tier,
      crawled: 0,
      hunterAdded: 0,
      deepAdded: 0,
      withEmail: 0,
      durationMs: Date.now() - t0,
    };
  }

  const overrides = backgroundEnrichmentOverrides();
  const previewOpts = { hunterFallback: false, skipWebsiteDiscovery: true } as const;
  const crawlOpts = tier === "preview" ? previewOpts : { hunterFallback: false, skipWebsiteDiscovery: true };

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

  if (tier === "preview") {
    const withEmail = crawled.filter((l) => (l.primaryEmail ?? "").trim()).length;
    return {
      tier,
      crawled: pending.length,
      hunterAdded: 0,
      deepAdded: 0,
      withEmail,
      durationMs: Date.now() - t0,
    };
  }

  const paidMeta = await getSearchMetadata(searchId);
  const paidEnrichmentDone =
    typeof paidMeta?.[SEARCH_PAID_ENRICHMENT_AT_KEY] === "string" &&
    paidMeta[SEARCH_PAID_ENRICHMENT_AT_KEY].trim().length > 0;

  if (paidEnrichmentDone) {
    const latest = await getSearchWithLeads(searchId);
    const withEmail =
      latest?.leads.filter((l) => (l.primaryEmail ?? "").trim()).length ?? 0;
    return {
      tier,
      crawled: pending.length,
      hunterAdded: 0,
      deepAdded: 0,
      withEmail,
      durationMs: Date.now() - t0,
    };
  }

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
  await mergeSearchMetadata(searchId, {
    [SEARCH_PAID_ENRICHMENT_AT_KEY]: new Date().toISOString(),
  });
  return {
    tier,
    crawled: pending.length,
    hunterAdded: hunterChanged.length,
    deepAdded: deepChanged.length,
    withEmail,
    durationMs: Date.now() - t0,
  };
}
