import type Stripe from "stripe";
import { getSearchDeliveryInfo } from "@/lib/db";
import { buildPackCsvAttachment } from "@/lib/build-pack-csv-for-search";
import { formatMarketLocation } from "@/lib/format-market-location";
import { sendPackDeliveryEmail } from "@/lib/sendPackDeliveryEmail";

/** One-time pack checkout (not subscription signup). */
export function isOneTimePackCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return !(session.metadata?.userId && session.metadata?.plan);
}

/**
 * Chain finalize, CSV build, and delivery email. Call only after tryClaimPackDeliveryEmail.
 */
export async function runPackDeliveryJob(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== "paid") return;

  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!email) {
    console.warn("[stripe-pack-delivery] no buyer email; skipping", session.id);
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
      if (info?.location) market = formatMarketLocation(info.location) || info.location;
      if (info?.csvPath?.trim()) csvPath = info.csvPath.trim();
      if (info?.csvUrl?.trim()) csvUrl = info.csvUrl.trim();
    } catch (e) {
      console.warn("[stripe-pack-delivery] delivery info failed", session.id, e);
    }

    if (!csvPath && !csvUrl) {
      const tCsv = Date.now();
      try {
        const built = await buildPackCsvAttachment(searchId);
        console.log("[stripe-pack-delivery] buildPackCsvAttachment ms=", Date.now() - tCsv, {
          searchId,
        });
        if (built) {
          csvBuffer = built.buffer;
          csvFilename = built.filename;
        } else {
          console.warn("[stripe-pack-delivery] no CSV rows", searchId);
        }
      } catch (e) {
        console.warn("[stripe-pack-delivery] CSV build failed", session.id, e);
      }
    }
  }

  await sendPackDeliveryEmail({
    toEmail: email,
    sessionId: session.id,
    searchId: Number.isFinite(searchId) && searchId > 0 ? searchId : undefined,
    market,
    csvPath,
    csvUrl,
    csvBuffer,
    csvFilename,
  });
  console.log("[stripe-pack-delivery] email sent", session.id, {
    market,
    csvAttached: Boolean(csvPath || csvUrl || csvBuffer),
  });
}

export async function trackPreviewCaptureConversion(session: Stripe.Checkout.Session): Promise<void> {
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const market = formatMarketLocation(session.metadata?.market ?? "") || session.metadata?.market || "";
  if (!email || !market.trim()) return;
  const { markPreviewCapturesConverted } = await import("@/lib/preview-captures");
  const updated = await markPreviewCapturesConverted(email, market);
  if (updated > 0) {
    console.log("[stripe-pack-delivery] preview capture converted", { email, market, updated });
  }
}
