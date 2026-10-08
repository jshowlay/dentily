import { cookies, headers } from "next/headers";
import type Stripe from "stripe";
import { readAdminAuthorized, type CookieReader } from "@/lib/admin-sample-auth";
import { auth } from "@/lib/auth";
import { isSearchOwnedByUser, verifyPackDownloadTokenForSearch } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export type PackExportAccessInput = {
  searchId: number;
  request: Request;
  cookies?: CookieReader;
};

export type PackExportAccessResult =
  | { allowed: true; via: "admin" | "session" | "token" | "owner" }
  | { allowed: false; message: string };

function parseSearchIdFromStripeSession(session: Stripe.Checkout.Session, expectedSearchId: number): boolean {
  const raw = session.metadata?.searchId;
  const searchId = raw ? Number(raw) : NaN;
  return Number.isFinite(searchId) && searchId === expectedSearchId;
}

async function allowViaStripeSession(searchId: number, sessionId: string): Promise<boolean> {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return false;
    return parseSearchIdFromStripeSession(session, searchId);
  } catch (e) {
    console.warn("[pack-export-access] stripe session verify failed", sessionId, e);
    return false;
  }
}

/**
 * CSV export requires paid search plus proof of purchase (Stripe session id or pack download token),
 * admin session, or logged-in owner (dashboard).
 */
export async function verifyPackExportAccess(input: PackExportAccessInput): Promise<PackExportAccessResult> {
  const { searchId, request, cookies } = input;

  if (readAdminAuthorized(request, cookies)) {
    return { allowed: true, via: "admin" };
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  if (sessionId) {
    if (await allowViaStripeSession(searchId, sessionId)) {
      return { allowed: true, via: "session" };
    }
  }

  const token = url.searchParams.get("token")?.trim();
  if (token && (await verifyPackDownloadTokenForSearch(searchId, token))) {
    return { allowed: true, via: "token" };
  }

  const userIdRaw = (await auth())?.user?.id;
  const userId = userIdRaw ? Number(userIdRaw) : NaN;
  if (Number.isFinite(userId) && userId > 0 && (await isSearchOwnedByUser(searchId, userId))) {
    return { allowed: true, via: "owner" };
  }

  return {
    allowed: false,
    message: "Unauthorized. Use the download link from your payment confirmation or sign in if this pack is on your account.",
  };
}

/** Build a Request whose query string carries session_id / token (for server components). */
export async function packAccessRequestFromPageQuery(
  searchId: number,
  query: { sessionId?: string | null; token?: string | null }
): Promise<Request> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const params = new URLSearchParams({ searchId: String(searchId) });
  const sessionId = query.sessionId?.trim();
  const token = query.token?.trim();
  if (sessionId) params.set("session_id", sessionId);
  if (token) params.set("token", token);
  return new Request(`${proto}://${host}/results?${params.toString()}`);
}

export async function verifyPackAccessForResultsPage(
  searchId: number,
  query: { sessionId?: string | null; token?: string | null }
): Promise<PackExportAccessResult> {
  return verifyPackExportAccess({
    searchId,
    request: await packAccessRequestFromPageQuery(searchId, query),
    cookies: await cookies(),
  });
}
