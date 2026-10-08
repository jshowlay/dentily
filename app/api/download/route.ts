import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getSearchDeliveryInfo, getSearchForExport } from "@/lib/db";
import {
  formatMarketLocation,
  marketLocationFilenamePart,
} from "@/lib/format-market-location";
import { computeQuickStartPackStatsFromExportRows } from "@/lib/pdf/quick-start-pack-stats";
import { renderQuickStartGuideBuffer } from "@/lib/pdf/render-quick-start-guide";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/download?session_id=cs_...
 * Verifies the Stripe Checkout Session is paid, then streams the branded
 * quick-start guide PDF. Never serves a file for an unpaid/missing session.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Invalid or unpaid session" }, { status: 403 });
  }

  let session: Stripe.Checkout.Session;
  try {
    const stripe = getStripe();
    session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Invalid or unpaid session" }, { status: 403 });
    }
  } catch (err) {
    console.error("[api/download] session verification failed", err);
    return NextResponse.json({ error: "Invalid or unpaid session" }, { status: 403 });
  }

  const raw = session.metadata?.searchId;
  const searchId = raw ? Number(raw) : NaN;

  let market = "Your Market";
  let totalPractices = 150;
  let contactableLeads = 0;
  let topPriorityLeads = 0;
  let emailCount = 0;
  let formCount = 0;
  let phoneCount = 0;

  if (Number.isFinite(searchId) && searchId > 0) {
    try {
      const { search, rows } = await getSearchForExport(searchId);
      if (search?.location) market = formatMarketLocation(search.location) || search.location;
      if (rows.length > 0) {
        const stats = computeQuickStartPackStatsFromExportRows(rows);
        totalPractices = stats.totalPractices;
        contactableLeads = stats.contactableLeads;
        topPriorityLeads = stats.topPriorityLeads;
        emailCount = stats.emailCount;
        formCount = stats.formCount;
        phoneCount = stats.phoneCount;
      } else {
        const info = await getSearchDeliveryInfo(searchId);
        if (info) {
          totalPractices = info.totalPractices;
          contactableLeads = info.contactableLeads;
          topPriorityLeads = info.topPriorityLeads;
          emailCount = info.emailCount;
          formCount = info.formCount;
          phoneCount = info.phoneCount;
        }
      }
    } catch (e) {
      console.warn("[api/download] could not fetch pack stats", searchId, e);
    }
  }

  const buffer = await renderQuickStartGuideBuffer({
    market,
    totalPractices,
    contactableLeads,
    topPriorityLeads,
    emailCount,
    formCount,
    phoneCount,
  });

  const filename = `dentily-${marketLocationFilenamePart(market)}-quick-start.pdf`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
