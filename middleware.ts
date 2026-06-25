import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Stripe webhooks must reach the route handler directly — no auth, no redirects.
 * Signature verification in app/api/webhooks/stripe/route.ts is the security layer.
 *
 * Production note: apex dentily.co 307-redirects to www.dentily.co at the edge.
 * Configure Stripe's webhook endpoint as https://www.dentily.co/api/webhooks/stripe
 * (POST to the apex URL never reaches this handler).
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/webhooks/stripe"],
};
