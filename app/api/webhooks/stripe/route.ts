import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillCheckoutSession } from "@/lib/payments";
import {
  fulfillSubscriptionCheckout,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "@/lib/subscription-stripe";
import { getSearchDeliveryInfo } from "@/lib/db";
import { buildPackCsvAttachment } from "@/lib/build-pack-csv-for-search";
import { getStripe } from "@/lib/stripe";
import { sendPackDeliveryEmail } from "@/lib/sendPackDeliveryEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public route — no session auth. Stripe verifies via stripe-signature header below.
// Endpoint URL in Stripe Dashboard must be https://www.dentily.co/api/webhooks/stripe
// (apex dentily.co returns HTTP 307 before this handler runs).

/**
 * In-process guard so a Stripe retry of the same event doesn't send a duplicate
 * delivery email. Fulfillment itself is idempotent at the DB layer; this only
 * dedupes the email side effect within a running instance.
 */
const deliveredSessions = new Set<string>();

async function deliverPackEmail(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== "paid") return;
  if (deliveredSessions.has(session.id)) return;

  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!email) {
    console.warn("[webhooks/stripe] no buyer email on session; skipping delivery email", session.id);
    return;
  }

  const raw = session.metadata?.searchId;
  const searchId = raw ? Number(raw) : NaN;
  let market: string | undefined;
  let csvPath: string | undefined;
  let csvUrl: string | undefined;
  let csvBuffer: Buffer | undefined;
  let csvFilename: string | undefined;

  if (Number.isFinite(searchId) && searchId > 0) {
    try {
      const info = await getSearchDeliveryInfo(searchId);
      if (info?.location) market = info.location;
      if (info?.csvPath?.trim()) csvPath = info.csvPath.trim();
      if (info?.csvUrl?.trim()) csvUrl = info.csvUrl.trim();
    } catch (e) {
      console.warn("[webhooks/stripe] could not fetch delivery info for session", session.id, e);
    }

    if (!csvPath && !csvUrl) {
      try {
        const built = await buildPackCsvAttachment(searchId);
        if (built) {
          csvBuffer = built.buffer;
          csvFilename = built.filename;
        } else {
          console.warn("[webhooks/stripe] no CSV rows for search; email will omit attachment", searchId);
        }
      } catch (e) {
        console.warn("[webhooks/stripe] could not build CSV attachment for session", session.id, e);
      }
    }
  }

  deliveredSessions.add(session.id);
  try {
    await sendPackDeliveryEmail({
      toEmail: email,
      sessionId: session.id,
      market,
      csvPath,
      csvUrl,
      csvBuffer,
      csvFilename,
    });
    console.log("[webhooks/stripe] delivery email sent", session.id, {
      market,
      csvAttached: Boolean(csvPath || csvUrl || csvBuffer),
    });
  } catch (err) {
    // Best-effort: never fail the webhook on email errors (avoids Stripe retries
    // re-running fulfillment). Allow a future retry by clearing the guard.
    deliveredSessions.delete(session.id);
    console.error("[webhooks/stripe] delivery email failed", session.id, err);
  }
}

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.userId && session.metadata?.plan) {
          await fulfillSubscriptionCheckout(session);
        } else {
          await fulfillCheckoutSession(session);
          await deliverPackEmail(session);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_succeeded": {
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[webhooks/stripe] handler failed", event.type, err);
    return NextResponse.json({ error: { message: "Fulfillment failed." } }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
