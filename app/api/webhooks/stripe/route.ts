import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillCheckoutSession } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/stripe] STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: { message: "Webhook not configured." } }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: { message: "Missing stripe-signature header." } }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[webhooks/stripe] signature verification failed", err);
    return NextResponse.json({ error: { message: "Invalid signature." } }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await fulfillCheckoutSession(session);
    } catch (err) {
      console.error("[webhooks/stripe] fulfill failed", err);
      return NextResponse.json({ error: { message: "Fulfillment failed." } }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
