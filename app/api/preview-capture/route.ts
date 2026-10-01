import { NextResponse } from "next/server";
import { z } from "zod";
import { getSearchWithLeads, isDatabaseConfigured } from "@/lib/db";
import {
  buildPreviewSnapshotFromLeads,
  hasPurchasedMarket,
  setPreviewEmailSent,
  upsertPreviewCapture,
} from "@/lib/preview-captures";
import { sendPreviewSequenceEmail } from "@/lib/sendPreviewSequenceEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().email(),
  market: z.string().trim().min(2),
  searchId: z.coerce.number().int().positive(),
  /** Honeypot — must be empty */
  companyWebsite: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: { message: "Database not configured." } }, { status: 503 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: { message: "Invalid JSON." } }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Please enter a valid email address." } },
        { status: 400 }
      );
    }

    const { email, market, searchId, companyWebsite } = parsed.data;
    if (companyWebsite?.trim()) {
      return NextResponse.json({ ok: true });
    }

    const search = await getSearchWithLeads(searchId);
    if (!search) {
      return NextResponse.json({ error: { message: "Search not found." } }, { status: 404 });
    }

    if (search.isPaid) {
      return NextResponse.json({ error: { message: "This pack is already unlocked." } }, { status: 400 });
    }

    const marketNorm = market.trim();
    if (search.location.trim().toLowerCase() !== marketNorm.toLowerCase()) {
      return NextResponse.json({ error: { message: "Market does not match this search." } }, { status: 400 });
    }

    if (await hasPurchasedMarket(email, marketNorm)) {
      return NextResponse.json({ ok: true, skipped: "already_purchased" });
    }

    const leadCount = search.resultCount ?? search.leads.length;
    const previewSnapshot = buildPreviewSnapshotFromLeads(search.leads, 3);

    const upsert = await upsertPreviewCapture({
      email,
      market: search.location,
      searchId: String(searchId),
      leadCount,
      previewSnapshot,
    });

    if (upsert.action === "blocked_purchased") {
      return NextResponse.json({ ok: true, skipped: "already_purchased" });
    }

    if (!upsert.skipEmail1) {
      try {
        await sendPreviewSequenceEmail(upsert.row, 1);
        await setPreviewEmailSent(upsert.row.id, 1);
      } catch (err) {
        console.error("[api/preview-capture] email 1 failed", err);
        return NextResponse.json(
          { error: { message: "Could not send preview email. Try again in a moment." } },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/preview-capture]", err);
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "Capture failed." } },
      { status: 500 }
    );
  }
}
