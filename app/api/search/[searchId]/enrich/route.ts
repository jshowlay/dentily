import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSearchWithLeads,
  markPendingLeadsEnrichmentSkipped,
  updateLeadsEnrichmentForSearch,
} from "@/lib/db";
import { batchEnrichLeads, runDeepEnrichment, runHunterFallback } from "@/lib/email-enrichment";
import { backgroundEnrichmentOverrides, isEmailEnrichmentDisabled } from "@/lib/email-enrichment-config";
import type { Lead } from "@/lib/types";

/**
 * Crawl + persist leads in small chunks so progress survives a dropped DB
 * connection during the long enrichment run (Neon serverless closes idle
 * connections). Without this, a single end-of-run write could fail and leave
 * every lead stuck on `pending`.
 */
const ENRICH_CHUNK_SIZE = 15;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const paramsSchema = z.object({
  searchId: z.coerce.number().int().positive(),
});

/** Best-effort split of a stored search location ("Dallas, TX") into city/state. */
function parseCityState(location: string): { city: string; state: string } {
  const parts = (location ?? "").split(",").map((p) => p.trim());
  return { city: parts[0] ?? "", state: parts[1] ?? "" };
}

export async function POST(
  _request: Request,
  context: { params: { searchId: string } | Promise<{ searchId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: { message: "Missing DATABASE_URL." } }, { status: 500 });
    }

    const rawParams = await Promise.resolve(context.params);
    const parsedParams = paramsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: { message: "Invalid searchId." } }, { status: 400 });
    }

    const { searchId } = parsedParams.data;
    const search = await getSearchWithLeads(searchId);
    if (!search) {
      return NextResponse.json({ error: { message: "Search not found." } }, { status: 404 });
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

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: "No pending leads with websites to crawl." });
    }

    if (isEmailEnrichmentDisabled()) {
      const skipped = await markPendingLeadsEnrichmentSkipped(
        searchId,
        pending.map((l) => l.placeId),
        "Website email enrichment disabled — use phone, contact form (if listed), and Maps."
      );
      return NextResponse.json({ ok: true, updated: 0, skipped });
    }

    const overrides = backgroundEnrichmentOverrides();

    // Pass 1: website crawl, persisting after each chunk so partial progress
    // is never lost if a later chunk or the connection fails.
    const crawled: Lead[] = [];
    for (let i = 0; i < pending.length; i += ENRICH_CHUNK_SIZE) {
      const chunk = pending.slice(i, i + ENRICH_CHUNK_SIZE);
      const enrichedChunk = await batchEnrichLeads(chunk, overrides, { hunterFallback: false });
      await updateLeadsEnrichmentForSearch(searchId, enrichedChunk);
      crawled.push(...enrichedChunk);
      console.log(
        `[api/search/enrich] searchId=${searchId} crawled ${Math.min(
          i + ENRICH_CHUNK_SIZE,
          pending.length
        )}/${pending.length}`
      );
    }

    // Pass 2: Hunter.io fallback for leads still without an email (global
    // per-search cap), then persist only the rows it changed.
    const hunted = await runHunterFallback(crawled);
    const hunterChanged = hunted.filter((lead, idx) => lead.primaryEmail !== crawled[idx]?.primaryEmail);
    if (hunterChanged.length > 0) {
      await updateLeadsEnrichmentForSearch(searchId, hunterChanged);
    }

    // Pass 3: multi-tier deep enrichment (deep crawl → ZeroBounce pattern guess →
    // Apollo → NPI/Prospeo) for whatever is still unresolved. Persist its changes.
    const { city, state } = parseCityState(search.location);
    const deepened = await runDeepEnrichment(hunted, { city, state });
    const deepChanged = deepened.filter((lead, idx) => lead.primaryEmail !== hunted[idx]?.primaryEmail);
    if (deepChanged.length > 0) {
      await updateLeadsEnrichmentForSearch(searchId, deepChanged);
    }

    const totalWithEmail = deepened.filter((l) => (l.primaryEmail ?? "").trim()).length;
    console.log(
      `[api/search/enrich] searchId=${searchId} updated=${crawled.length} hunterAdded=${hunterChanged.length} deepAdded=${deepChanged.length} totalWithEmail=${totalWithEmail}`
    );
    return NextResponse.json({
      ok: true,
      updated: crawled.length,
      hunterAdded: hunterChanged.length,
      deepAdded: deepChanged.length,
      withEmail: totalWithEmail,
    });
  } catch (e) {
    console.error("[api/search/enrich] failed", e);
    return NextResponse.json(
      { error: { message: e instanceof Error ? e.message : "Enrichment failed." } },
      { status: 500 }
    );
  }
}
