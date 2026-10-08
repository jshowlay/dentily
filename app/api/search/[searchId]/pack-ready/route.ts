import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSearchForExport } from "@/lib/db";
import { isPaidPackExportReady } from "@/lib/paid-pack-enrichment-lock";
import { verifyPackExportAccess } from "@/lib/pack-export-access";

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

    const { search } = await getSearchForExport(searchId);
    if (!search) {
      return NextResponse.json({ error: { message: "Search not found." } }, { status: 404 });
    }
    if (!search.isPaid) {
      return NextResponse.json({ ready: false, preparing: false, reason: "unpaid" });
    }

    const ready = await isPaidPackExportReady(searchId);
    return NextResponse.json({
      ready,
      preparing: !ready,
    });
  } catch (e) {
    console.error("[api/search/pack-ready]", e);
    return NextResponse.json(
      { error: { message: e instanceof Error ? e.message : "Status check failed." } },
      { status: 500 }
    );
  }
}
