import type Stripe from "stripe";
import { waitUntil } from "@vercel/functions";
import {
  markPackDeliveryEmailSent,
  releasePackDeliveryClaim,
  tryClaimPackDeliveryEmail,
  tryRecordStripeWebhookEvent,
} from "@/lib/db";
import { fulfillCheckoutSession } from "@/lib/payments";
import {
  isOneTimePackCheckoutSession,
  runPackDeliveryJob,
  trackPreviewCaptureConversion,
} from "@/lib/stripe-pack-delivery";
import { sendPackDeliveryFailureAlert } from "@/lib/send-pack-delivery-alert";

function searchIdFromSession(session: Stripe.Checkout.Session): number | null {
  const raw = session.metadata?.searchId;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function runOneTimePackCheckoutSideEffects(session: Stripe.Checkout.Session): Promise<void> {
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const searchId = searchIdFromSession(session);

  try {
    if (await tryClaimPackDeliveryEmail(session.id)) {
      await runPackDeliveryJob(session);
      await markPackDeliveryEmailSent(session.id);
    } else {
      console.log("[webhooks/stripe] pack delivery skipped (already sent or in progress)", session.id);
    }

    await trackPreviewCaptureConversion(session);
  } catch (err) {
    console.error("[webhooks/stripe] background pack delivery failed", session.id, err);
    await releasePackDeliveryClaim(session.id).catch(() => {});
    await sendPackDeliveryFailureAlert({
      customerEmail,
      stripeSessionId: session.id,
      searchId,
      error: err,
    }).catch((alertErr) => {
      console.error("[webhooks/stripe] ops alert email failed", alertErr);
    });
  }
}

/**
 * Fast path: mark paid synchronously; defer CSV + email via waitUntil (production).
 */
export async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  if (!isOneTimePackCheckoutSession(session)) {
    const { fulfillSubscriptionCheckout } = await import("@/lib/subscription-stripe");
    await fulfillSubscriptionCheckout(session);
    await tryRecordStripeWebhookEvent(event.id, event.type);
    return;
  }

  const fulfillment = await fulfillCheckoutSession(session);
  if (!fulfillment.ok) {
    console.warn("[webhooks/stripe] fulfillCheckoutSession", session.id, fulfillment.reason);
    throw new Error(fulfillment.reason ?? "Fulfillment failed.");
  }

  const isNewEvent = await tryRecordStripeWebhookEvent(event.id, event.type);
  if (!isNewEvent) {
    console.log("[webhooks/stripe] duplicate checkout.session.completed skipped", event.id);
    return;
  }

  const background = runOneTimePackCheckoutSideEffects(session);
  if (process.env.NODE_ENV === "development") {
    await background;
  } else {
    waitUntil(background);
  }
}
