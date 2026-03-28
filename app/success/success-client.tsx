"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export type SuccessOutcome =
  | { kind: "no_session" }
  | { kind: "ok"; searchId: number }
  | { kind: "error"; message: string };

export function SuccessClient({ outcome }: { outcome: SuccessOutcome }) {
  return (
    <Card className="mx-auto max-w-lg border-slate-200 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">
          {outcome.kind === "ok" ? "Payment confirmed" : "We could not confirm payment"}
        </CardTitle>
        {outcome.kind === "ok" ? (
          <CardDescription>Your lead pack is unlocked for this search.</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {outcome.kind === "ok" ? (
          <>
            <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-700">
              <li>
                <span className="font-medium text-slate-900">Payment confirmed</span> — Stripe reported a successful
                checkout.
              </li>
              <li>
                <span className="font-medium text-slate-900">What happens next</span> — Download your CSV anytime. Use
                outreach as a starting point and follow your compliance process.
              </li>
              <li>
                <span className="font-medium text-slate-900">Where to go</span> — Open results to review the table, or
                download the file now.
              </li>
            </ol>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href={`/api/search/${outcome.searchId}/export`}
                className={cn(buttonVariants({ size: "default" }), "text-center")}
                download
              >
                Download lead pack (CSV)
              </Link>
              <Link
                href={`/results?searchId=${outcome.searchId}`}
                className={cn(buttonVariants({ variant: "outline", size: "default" }), "text-center")}
              >
                View results &amp; outreach
              </Link>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Run another market?</p>
              <p className="mt-1">
                Start a new search for a different city or area — each run is a separate {SITE.leadPackPriceLabel} pack
                when you unlock.
              </p>
              <Link
                href="/search"
                className="mt-3 inline-flex font-medium text-blue-700 underline-offset-4 hover:underline"
              >
                {SITE.primaryCta}
              </Link>
            </div>
          </>
        ) : null}

        {outcome.kind === "no_session" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">Missing checkout session</p>
            <p className="mt-1 text-amber-900/90">
              This page needs a valid <code className="rounded bg-white/80 px-1">session_id</code> from Stripe. Open it
              from the redirect after payment, or return to your results and use download if you are already unlocked.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/" className={cn(buttonVariants({ size: "default" }), "text-center")}>
                Home
              </Link>
              <Link href="/search" className={cn(buttonVariants({ variant: "outline", size: "default" }), "text-center")}>
                {SITE.primaryCta}
              </Link>
            </div>
          </div>
        ) : null}

        {outcome.kind === "error" ? (
          <p className="text-sm text-red-700">{outcome.message}</p>
        ) : null}

        {outcome.kind !== "no_session" ? (
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "inline-flex w-fit")}>
            Back to home
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
