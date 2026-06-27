import { createElement, type ReactElement } from "react";
import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type Stripe from "stripe";
import { getSearchDeliveryInfo } from "@/lib/db";
import { QuickStartGuide } from "@/lib/pdf/QuickStartGuide";
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
      const info = await getSearchDeliveryInfo(searchId);
      if (info?.location) market = info.location;
      if (info?.totalPractices) totalPractices = info.totalPractices;
      if (info?.contactableLeads) contactableLeads = info.contactableLeads;
      if (info?.topPriorityLeads) topPriorityLeads = info.topPriorityLeads;
      if (info?.emailCount) emailCount = info.emailCount;
      if (info?.formCount) formCount = info.formCount;
      if (info?.phoneCount) phoneCount = info.phoneCount;
    } catch (e) {
      console.warn("[api/download] could not fetch delivery info", searchId, e);
    }
  }

  const buffer = await renderToBuffer(
    createElement(QuickStartGuide, {
      market,
      totalPractices,
      contactableLeads,
      topPriorityLeads,
      emailCount,
      formCount,
      phoneCount,
    }) as ReactElement
  );

  const marketSlug = market.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `dentily-${marketSlug}-quick-start.pdf`;

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
