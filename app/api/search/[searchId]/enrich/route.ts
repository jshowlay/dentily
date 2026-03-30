import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSearchWithLeads,
  markPendingLeadsEnrichmentSkipped,
  updateLeadsEnrichmentForSearch,
} from "@/lib/db";
import { batchEnrichLeads } from "@/lib/email-enrichment";
import { backgroundEnrichmentOverrides, isEmailEnrichmentDisabled } from "@/lib/email-enrichment-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const paramsSchema = z.object({
  searchId: z.coerce.number().int().positive(),
});

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

    const enriched = await batchEnrichLeads(pending, backgroundEnrichmentOverrides());
    await updateLeadsEnrichmentForSearch(searchId, enriched);
    console.log(`[api/search/enrich] searchId=${searchId} updated=${enriched.length}`);
    return NextResponse.json({ ok: true, updated: enriched.length });
  } catch (e) {
    console.error("[api/search/enrich] failed", e);
    return NextResponse.json(
      { error: { message: e instanceof Error ? e.message : "Enrichment failed." } },
      { status: 500 }
    );
  }
}
