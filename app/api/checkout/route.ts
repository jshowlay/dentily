import { NextResponse } from "next/server";
import { z } from "zod";
import { getSearchRowForPayment } from "@/lib/db";
import { SITE } from "@/lib/site-config";
import { getAppBaseUrl, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  searchId: z.coerce.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { searchId } = bodySchema.parse(json);

    const row = await getSearchRowForPayment(searchId);
    if (!row) {
      return NextResponse.json({ error: { message: "Search not found." } }, { status: 404 });
    }
    if (row.isPaid) {
      return NextResponse.json({ error: { message: "This search is already unlocked." } }, { status: 400 });
    }

    const stripe = getStripe();
    const base = getAppBaseUrl(request);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: SITE.leadPackName,
              description:
                "50 high-opportunity dental practices with prioritized insights and ready-to-use outreach messages.",
            },
            unit_amount: 4900,
          },
          quantity: 1,
        },
      ],
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?searchId=${searchId}`,
      metadata: {
        searchId: String(searchId),
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: { message: "Stripe did not return a checkout URL." } }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[api/checkout]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: "Invalid request.", details: error.issues } }, { status: 400 });
    }
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Checkout failed." } },
      { status: 500 }
    );
  }
}
