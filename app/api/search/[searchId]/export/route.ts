import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { toSlugPart } from "@/lib/csv";
import { getSearchForExport } from "@/lib/db";
import { verifyPackExportAccess } from "@/lib/pack-export-access";
import { ensurePaidPackReadyForExport } from "@/lib/ensure-paid-pack-ready";
import {
  buildLeadPackCsv,
  buildLeadPackRowsFromExport,
  isLeadPackInstructionRow,
  logExportPrioritySummary,
} from "@/lib/lead-pack-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z.object({
  searchId: z.coerce.number().int().positive(),
});

export async function GET(
  request: Request,
  context: { params: { searchId: string } | Promise<{ searchId: string }> }
) {
  try {
    const rawParams = await Promise.resolve(context.params);
    const parsedParams = paramsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: { message: "Invalid searchId." } }, { status: 400 });
    }

    const { searchId } = parsedParams.data;
    const access = await verifyPackExportAccess({
      searchId,
      request,
      cookies: await cookies(),
    });
    if (!access.allowed) {
      return NextResponse.json({ error: { message: access.message } }, { status: 403 });
    }

    const ready = await ensurePaidPackReadyForExport(searchId);
    console.log("[api/search/export] pack ready", searchId, ready);
    const { search, rows } = await getSearchForExport(searchId);

    if (!search) {
      return NextResponse.json({ error: { message: "Search not found." } }, { status: 404 });
    }

    if (!search.isPaid) {
      return NextResponse.json(
        { error: { message: "Payment required to download leads" } },
        { status: 403 }
      );
    }

    const packRows = buildLeadPackRowsFromExport(rows);
    const csv = buildLeadPackCsv(packRows);
    const topYesCount = packRows.filter((r) => !isLeadPackInstructionRow(r) && r.top_lead === "Yes").length;
    logExportPrioritySummary(packRows, topYesCount);
    const filename = `dentily-${toSlugPart(search.location)}-dental-leads-${searchId}.csv`;
    const body = `\uFEFF${csv}`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/search/export] failed", error);
    return NextResponse.json(
      { error: { message: "Failed to export leads CSV." } },
      { status: 500 }
    );
  }
}
