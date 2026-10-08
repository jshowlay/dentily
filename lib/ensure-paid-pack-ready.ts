import { ensureDentistPackChainFinalized } from "@/lib/ensure-pack-chain-finalized";
import {
  acquirePaidEnrichmentRun,
  waitForPaidEnrichmentComplete,
} from "@/lib/paid-pack-enrichment-lock";
import { runSearchPackEnrichmentPaidWork } from "@/lib/search-pack-enrichment";

export type EnsurePaidPackReadyTimings = {
  enrichMs: number;
  chainMs: number;
  totalMs: number;
  enrichSkipped: boolean;
  chainSkipped: boolean;
};

/**
 * Single paid pipeline step: one enrich runner per search (export waits on webhook delivery).
 */
export async function ensurePaidPackReadyForExport(searchId: number): Promise<EnsurePaidPackReadyTimings> {
  const t0 = Date.now();
  let enrichMs = 0;
  let enrichSkipped = false;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const gate = await acquirePaidEnrichmentRun(searchId);
    if (gate === "skip") {
      enrichSkipped = true;
      break;
    }
    if (gate === "wait") {
      const ok = await waitForPaidEnrichmentComplete(searchId, 8 * 60 * 1000);
      if (ok) {
        enrichSkipped = true;
        break;
      }
      continue;
    }

    const tEnrich = Date.now();
    try {
      await runSearchPackEnrichmentPaidWork(searchId);
    } catch (e) {
      const { releasePaidEnrichmentClaim } = await import("@/lib/paid-pack-enrichment-lock");
      await releasePaidEnrichmentClaim(searchId);
      throw e;
    }
    enrichMs = Date.now() - tEnrich;
    break;
  }

  const tChain = Date.now();
  const chain = await ensureDentistPackChainFinalized(searchId);
  const chainMs = Date.now() - tChain;

  return {
    enrichMs,
    chainMs,
    totalMs: Date.now() - t0,
    enrichSkipped,
    chainSkipped: chain.skipped,
  };
}
