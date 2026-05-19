import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { getSubscriptionByUserId } from "@/lib/subscription-db";
import { getAppBaseUrl, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  plan: z.enum(["pro", "starter"]),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { plan } = bodySchema.parse(json);

    const proPriceId = process.env.STRIPE_PRO_PRICE_ID?.trim();
    const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID?.trim();

    if (plan === "pro" && !proPriceId) {
      return NextResponse.json({ error: "STRIPE_PRO_PRICE_ID is not configured." }, { status: 500 });
    }
    if (plan === "starter" && !starterPriceId) {
      return NextResponse.json({ error: "STRIPE_STARTER_PRICE_ID is not configured." }, { status: 500 });
    }

    const stripe = getStripe();
    const base = getAppBaseUrl(request);
    const session = await import("@/lib/auth").then((m) => m.auth());
    const email = session?.user?.email ?? undefined;

    let sub = await getSubscriptionByUserId(userId);
    let customerId = sub?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId: String(userId) },
      });
      customerId = customer.id;
    } else {
      await stripe.customers.update(customerId, {
        metadata: { userId: String(userId) },
      });
    }

    const priceId = plan === "pro" ? proPriceId! : starterPriceId!;

    const checkout = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: plan === "pro" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/dashboard?checkout=success`,
      cancel_url: `${base}/pricing`,
      metadata: { userId: String(userId), plan },
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[api/stripe/checkout]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed." },
      { status: 500 }
    );
  }
}
