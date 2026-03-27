import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCsv, toSlugPart } from "@/lib/csv";
import { getSearchForExport } from "@/lib/db";
import { ExportLeadRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z.object({
  searchId: z.coerce.number().int().positive(),
});

const exportColumns: Array<keyof ExportLeadRow> = [
  "name",
  "address",
  "website",
  "phone",
  "email",
  "rating",
  "review_count",
  "score",
  "reason",
  "outreach",
  "primary_type",
  "maps_url",
  "created_at",
];

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

    const csv = buildCsv(rows, exportColumns);
    const filename = `leadly-${toSlugPart(search.niche)}-${toSlugPart(search.location)}-${searchId}.csv`;
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
