import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getSubscriptionByUserId } from "@/lib/subscription-db";
import { getAppBaseUrl, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sub = await getSubscriptionByUserId(userId);
    if (!sub?.stripeCustomerId) {
      return NextResponse.json({ error: "No subscription found." }, { status: 404 });
    }

    const stripe = getStripe();
    const base = getAppBaseUrl(request);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${base}/dashboard`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("[api/stripe/portal]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Portal failed." },
      { status: 500 }
    );
  }
}
