import { SuccessClient, type SuccessOutcome, type SuccessPackSummary } from "@/app/success/success-client";
import { getSearchWithLeads, isDatabaseConfigured } from "@/lib/db";
import { verifyAndFulfillCheckoutSession } from "@/lib/payments";

export const dynamic = "force-dynamic";

async function loadPackSummary(searchId: number): Promise<SuccessPackSummary | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const parsed = await getSearchWithLeads(searchId);
    if (!parsed) return null;
    const totalCount = parsed.resultCount ?? parsed.leads.length;
    const highPriorityCount = parsed.leads.filter((l) => (l.priority ?? "").toLowerCase() === "high").length;
    return {
      searchId,
      location: parsed.location,
      totalCount,
      highPriorityCount,
    };
  } catch (e) {
    console.error("[success] pack summary", e);
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }> | { session_id?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const sessionId = sp.session_id ?? null;

  let outcome: SuccessOutcome;
  if (!sessionId) {
    outcome = { kind: "no_session" };
  } else {
    try {
      const result = await verifyAndFulfillCheckoutSession(sessionId);
      outcome = result.ok
        ? { kind: "ok", searchId: result.searchId }
        : { kind: "error", message: result.message };
    } catch (e) {
      console.error("[success]", e);
      outcome = {
        kind: "error",
        message: e instanceof Error ? e.message : "Could not verify payment.",
      };
    }
  }

  const packSummary =
    outcome.kind === "ok" ? await loadPackSummary(outcome.searchId) : null;

  return <SuccessClient outcome={outcome} packSummary={packSummary} sessionId={sessionId} />;
}
