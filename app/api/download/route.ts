import { createElement } from "react";
import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
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

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Invalid or unpaid session" }, { status: 403 });
    }
  } catch (err) {
    console.error("[api/download] session verification failed", err);
    return NextResponse.json({ error: "Invalid or unpaid session" }, { status: 403 });
  }

  const buffer = await renderToBuffer(createElement(QuickStartGuide));

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="dentily-dallas-quick-start.pdf"',
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
