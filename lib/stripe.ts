import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

/**
 * Base URL for Stripe redirects and absolute links.
 * When a Request is passed (e.g. from /api/checkout), prefers the Host the user actually used
 * so production checkout works even if NEXT_PUBLIC_APP_URL points at a removed preview deployment
 * (Vercel DEPLOYMENT_NOT_FOUND). Falls back to NEXT_PUBLIC_APP_URL, then VERCEL_URL, then localhost.
 */
export function getAppBaseUrl(request?: Request): string {
  if (request) {
    const fwdHost = request.headers.get("x-forwarded-host");
    const hostRaw = (fwdHost ?? request.headers.get("host") ?? "").split(",")[0].trim();
    const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
    const isLocal =
      !hostRaw ||
      /^localhost(:\d+)?$/i.test(hostRaw) ||
      /^127\.0\.0\.1(:\d+)?$/i.test(hostRaw);
    if (!isLocal && hostRaw) {
      return `${proto}://${hostRaw}`.replace(/\/$/, "");
    }
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//i, "");
    return `https://${host}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
