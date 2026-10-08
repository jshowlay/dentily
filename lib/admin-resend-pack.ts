import { markPackDeliveryEmailSent } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { runPackDeliveryJob } from "@/lib/stripe-pack-delivery";

export async function adminResendPackForStripeSession(stripeSessionId: string): Promise<{
  ok: boolean;
  message: string;
  searchId?: number;
}> {
  const id = stripeSessionId.trim();
  if (!id.startsWith("cs_")) {
    return { ok: false, message: "Expected a Stripe Checkout session id (cs_…)." };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(id);
  if (session.payment_status !== "paid") {
    return { ok: false, message: "Checkout session is not paid." };
  }

  const raw = session.metadata?.searchId;
  const searchId = raw ? Number(raw) : NaN;
  if (!Number.isFinite(searchId) || searchId <= 0) {
    return { ok: false, message: "Session metadata is missing searchId." };
  }

  await runPackDeliveryJob(session);
  await markPackDeliveryEmailSent(session.id);

  return { ok: true, message: "Pack delivery email resent.", searchId };
}
