import { NextResponse } from "next/server";
import { z } from "zod";
import { toSlugPart } from "@/lib/csv";
import { getSearchForExport } from "@/lib/db";
import {
  buildLeadPackCsv,
  buildLeadPackRowsFromExport,
  computeWhyNow,
  logExportPrioritySummary,
  sortByPriorityThenScore,
} from "@/lib/lead-pack-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z.object({
  searchId: z.coerce.number().int().positive(),
});

export async function GET(
  _request: Request,
  context: { params: { searchId: string } | Promise<{ searchId: string }> }
) {
  try {
    const rawParams = await Promise.resolve(context.params);
    const parsedParams = paramsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: { message: "Invalid searchId." } }, { status: 400 });
    }

    const { searchId } = parsedParams.data;
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

    const withWhy = rows.map((r) => ({
      ...r,
      why_now: computeWhyNow({
        website: r.website,
        rating: r.rating,
        review_count: r.review_count,
      }),
    }));
    const sorted = sortByPriorityThenScore(withWhy);
    const packRows = buildLeadPackRowsFromExport(sorted);
    const csv = buildLeadPackCsv(packRows);
    const topYesCount = packRows.filter((r) => r.top_lead === "Yes").length;
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
