import { NextResponse } from "next/server";
import { z } from "zod";
import { fulfillCheckoutSession } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  session_id: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { session_id } = bodySchema.parse(json);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { ok: false, error: { message: "This checkout session is not paid yet." } },
        { status: 402 }
      );
    }

    const result = await fulfillCheckoutSession(session);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: { message: result.reason ?? "Could not fulfill payment." } },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, searchId: result.searchId });
  } catch (error) {
    console.error("[api/verify-session]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: "Invalid request.", details: error.issues } }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: { message: error instanceof Error ? error.message : "Verification failed." } },
      { status: 500 }
    );
  }
}
