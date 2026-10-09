import { Resend } from "resend";

export type PackDeliveryFailureAlert = {
  customerEmail: string | null;
  stripeSessionId: string;
  searchId: number | null;
  error: unknown;
};

function alertRecipient(): string | null {
  return (
    process.env.PACK_DELIVERY_ALERT_EMAIL?.trim() ||
    process.env.DENTILY_OPS_ALERT_EMAIL?.trim() ||
    null
  );
}

export async function sendPackDeliveryFailureAlert(input: PackDeliveryFailureAlert): Promise<void> {
  const to = alertRecipient();
  if (!to) {
    console.warn(
      "[pack-delivery-alert] PACK_DELIVERY_ALERT_EMAIL not set; skipping ops alert",
      input.stripeSessionId
    );
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[pack-delivery-alert] RESEND_API_KEY not set; skipping ops alert");
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "Dentily <hello@dentily.co>";
  const errText =
    input.error instanceof Error
      ? `${input.error.message}\n${input.error.stack ?? ""}`
      : String(input.error);

  const subject = `[Dentily] Pack delivery failed — ${input.stripeSessionId}`;
  const text = [
    "Automated alert: background pack delivery failed after Stripe checkout.",
    "",
    `Customer email: ${input.customerEmail ?? "(unknown)"}`,
    `Stripe session: ${input.stripeSessionId}`,
    `Search ID: ${input.searchId ?? "(unknown)"}`,
    "",
    "Error:",
    errText,
    "",
    "Customer can still download from /success or email links (session_id) if the search was marked paid.",
    "Use POST /api/admin/resend-pack to retry delivery when fixed.",
  ].join("\n");

  const resend = new Resend(apiKey);
  await resend.emails.send({ from, to, subject, text });
  console.log("[pack-delivery-alert] sent ops alert", { to, sessionId: input.stripeSessionId });
}
