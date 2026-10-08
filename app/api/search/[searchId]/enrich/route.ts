import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSearchWithLeads } from "@/lib/db";
import { verifyPackExportAccess } from "@/lib/pack-export-access";
import { canViewFullLeadPackOnResults } from "@/lib/results-lead-preview";
import { ensureDentistPackChainFinalized } from "@/lib/ensure-pack-chain-finalized";
import { runSearchPackEnrichment } from "@/lib/search-pack-enrichment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const paramsSchema = z.object({
  searchId: z.coerce.number().int().positive(),
});

export async function POST(
  request: Request,
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
    await ensureDentistPackChainFinalized(searchId);

    const search = await getSearchWithLeads(searchId);
    if (!search) {
      return NextResponse.json({ error: { message: "Search not found." } }, { status: 404 });
    }

    let tier: "preview" | "paid" = "preview";
    if (search.isPaid) {
      const access = await verifyPackExportAccess({
        searchId,
        request,
        cookies: await cookies(),
      });
      if (!canViewFullLeadPackOnResults(search.isPaid, access)) {
        return NextResponse.json(
          { error: { message: "Unauthorized to enrich a paid pack without buyer proof." } },
          { status: 403 }
        );
      }
      tier = "paid";
    }

    const stats = await runSearchPackEnrichment(searchId, tier);
    console.log(`[api/search/enrich] searchId=${searchId}`, stats);

    return NextResponse.json({
      ok: true,
      tier: stats.tier,
      updated: stats.crawled,
      hunterAdded: stats.hunterAdded,
      deepAdded: stats.deepAdded,
      withEmail: stats.withEmail,
      durationMs: stats.durationMs,
    });
  } catch (e) {
    console.error("[api/search/enrich] failed", e);
    return NextResponse.json(
      { error: { message: e instanceof Error ? e.message : "Enrichment failed." } },
      { status: 500 }
    );
  }
}
