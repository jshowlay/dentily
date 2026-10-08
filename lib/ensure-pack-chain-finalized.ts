import {
  getSearchMetadata,
  getSearchWithLeads,
  mergeSearchMetadata,
  updateLeadsPackQualityForSearch,
} from "@/lib/db";
import { getNicheConfig } from "@/lib/niches";
import {
  finalizeDentistPackListingWithChainProbe,
  SEARCH_PACK_CHAIN_FINALIZED_AT_KEY,
  SEARCH_PACK_CHAIN_KEY_COUNT_KEY,
} from "@/lib/pack-listing-quality";

export function isPackChainProbeFinalized(
  searchMetadata: Record<string, unknown> | null | undefined
): boolean {
  const raw = searchMetadata?.[SEARCH_PACK_CHAIN_FINALIZED_AT_KEY];
  return typeof raw === "string" && raw.trim().length > 0;
}

export type EnsurePackChainFinalizedResult = {
  skipped: boolean;
  reason?: "empty" | "niche" | "already_finalized";
  chainProbeMs?: number;
  chainKeyCount?: number;
  totalMs?: number;
};

/**
 * Run deferred chain probe + pack re-rank before paid CSV delivery (idempotent).
 */
export async function ensureDentistPackChainFinalized(
  searchId: number
): Promise<EnsurePackChainFinalizedResult> {
  const t0 = Date.now();
  const searchMeta = await getSearchMetadata(searchId);
  if (isPackChainProbeFinalized(searchMeta)) {
    return { skipped: true, reason: "already_finalized", totalMs: Date.now() - t0 };
  }

  const search = await getSearchWithLeads(searchId);
  if (!search || search.leads.length === 0) {
    return { skipped: true, reason: "empty", totalMs: Date.now() - t0 };
  }

  const nicheConfig = getNicheConfig(search.niche);
  if (nicheConfig.id !== "dentists") {
    return { skipped: true, reason: "niche", totalMs: Date.now() - t0 };
  }

  const { leads, chainProbeMs, chainKeyCount } = await finalizeDentistPackListingWithChainProbe(
    search.leads,
    search.location
  );
  await updateLeadsPackQualityForSearch(searchId, leads);
  await mergeSearchMetadata(searchId, {
    [SEARCH_PACK_CHAIN_FINALIZED_AT_KEY]: new Date().toISOString(),
    [SEARCH_PACK_CHAIN_KEY_COUNT_KEY]: chainKeyCount,
  });

  const totalMs = Date.now() - t0;
  console.log(
    `[ensure-pack-chain] searchId=${searchId} finalized chainProbeMs=${chainProbeMs} keys=${chainKeyCount} totalMs=${totalMs}`
  );

  return {
    skipped: false,
    chainProbeMs,
    chainKeyCount,
    totalMs,
  };
}
