import { NextResponse } from "next/server";
import { z } from "zod";
import { toSlugPart } from "@/lib/csv";
import { getSearchForExport } from "@/lib/db";
import {
  buildLeadPackCsv,
  computeWhyNow,
  logExportPrioritySummary,
  sortByPriorityThenScore,
  type LeadPackCsvRow,
} from "@/lib/lead-pack-export";
import type { ExportLeadRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z.object({
  searchId: z.coerce.number().int().positive(),
});

function displayPriority(p: string | null): string | null {
  if (!p) return null;
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

function toPackRows(rows: ExportLeadRow[]): LeadPackCsvRow[] {
  const withWhy = rows.map((r) => ({
    ...r,
    why_now: computeWhyNow({
      website: r.website,
      rating: r.rating,
      review_count: r.review_count,
    }),
  }));
  const sorted = sortByPriorityThenScore(withWhy);
  return sorted.map((r, i) => ({
    name: r.name,
    address: r.address,
    website: r.website,
    phone: r.phone,
    email: r.email,
    rating: r.rating,
    review_count: r.review_count,
    score: r.score,
    priority: displayPriority(r.priority),
    opportunity_type: r.opportunity_type,
    why_now: r.why_now,
    reason: r.reason,
    outreach: r.outreach,
    maps_url: r.maps_url,
    top_lead: i < 10 ? "Yes" : "No",
  }));
}

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

    const packRows = toPackRows(rows);
    const top10 = packRows.slice(0, 10);
    const csv = buildLeadPackCsv(packRows, top10);
    logExportPrioritySummary(packRows, top10.length);
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
