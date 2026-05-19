import type Stripe from "stripe";
import {
  getSubscriptionByStripeCustomerId,
  updateSubscriptionByUserId,
  upsertSubscription,
  type SubscriptionStatus,
} from "@/lib/subscription-db";
import { getStripe } from "@/lib/stripe";

function mapStripeSubStatus(status: string): SubscriptionStatus {
  if (status === "active" || status === "trialing") return status;
  if (status === "past_due") return "past_due";
  if (status === "canceled" || status === "unpaid") return "canceled";
  return "inactive";
}

async function resolveUserIdFromCustomer(customerId: string): Promise<number | null> {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  const metaUserId = customer.metadata?.userId;
  if (metaUserId) {
    const id = Number(metaUserId);
    if (Number.isFinite(id) && id > 0) return id;
  }
  const sub = await getSubscriptionByStripeCustomerId(customerId);
  return sub?.userId ?? null;
}

export async function fulfillSubscriptionCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const userIdRaw = session.metadata?.userId;
  const plan = session.metadata?.plan;
  const userId = userIdRaw ? Number(userIdRaw) : NaN;
  if (!Number.isFinite(userId) || userId <= 0) return;

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) return;

  if (plan === "starter" && session.payment_status === "paid") {
    await upsertSubscription({
      userId,
      stripeCustomerId: customerId,
      status: "active",
      plan: "starter_one_time",
      incrementCredits: 1,
    });
    return;
  }

  if (plan === "pro" && session.mode === "subscription") {
    await upsertSubscription({
      userId,
      stripeCustomerId: customerId,
      status: "active",
      plan: "pro",
      creditsRemaining: 3,
    });
  }
}

export async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserIdFromCustomer(sub.customer as string);
  if (!userId) return;

  await upsertSubscription({
    userId,
    stripeCustomerId: sub.customer as string,
    stripeSubscriptionId: sub.id,
    status: mapStripeSubStatus(sub.status),
    plan: "pro",
    billingCycleStart: new Date(sub.current_period_start * 1000),
  });
}

export async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserIdFromCustomer(sub.customer as string);
  if (!userId) return;
  await updateSubscriptionByUserId(userId, {
    status: "canceled",
    stripeSubscriptionId: null,
  });
}

export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  if (invoice.billing_reason !== "subscription_cycle") return;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const userId = await resolveUserIdFromCustomer(customerId);
  if (!userId) return;

  await updateSubscriptionByUserId(userId, {
    creditsRemaining: 3,
    billingCycleStart: new Date(),
    status: "active",
    plan: "pro",
  });
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const userId = await resolveUserIdFromCustomer(customerId);
  if (!userId) return;
  await updateSubscriptionByUserId(userId, { status: "past_due" });
}
