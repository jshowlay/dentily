import Link from "next/link";
import { SuccessClient, type SuccessOutcome } from "@/app/success/success-client";
import { verifyAndFulfillCheckoutSession } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id ?? null;

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

  return (
    <main className="min-h-screen bg-white">
      <header className="w-full bg-black py-4 text-white">
        <div className="container-page flex items-center justify-between">
          <p className="text-lg font-semibold">Leadly</p>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-slate-100"
          >
            Home
          </Link>
        </div>
      </header>
      <section className="container-page py-10">
        <SuccessClient outcome={outcome} />
      </section>
    </main>
  );
}
