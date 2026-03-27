"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SuccessOutcome =
  | { kind: "no_session" }
  | { kind: "ok"; searchId: number }
  | { kind: "error"; message: string };

export function SuccessClient({ outcome }: { outcome: SuccessOutcome }) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>
          {outcome.kind === "ok" ? "Payment successful" : "Something went wrong"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {outcome.kind === "ok" ? (
          <>
            <p className="text-sm font-medium text-slate-900">Your Dentily lead pack is ready</p>
            <p className="text-sm text-slate-700">Download your prioritized practices and outreach anytime from results.</p>
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
                View results
              </Link>
            </div>
          </>
        ) : null}

        {outcome.kind === "no_session" ? (
          <p className="text-sm text-red-700">
            Missing session_id. Open this page from Stripe after completing checkout.
          </p>
        ) : null}

        {outcome.kind === "error" ? <p className="text-sm text-red-700">{outcome.message}</p> : null}

        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "inline-flex w-fit")}>
          Back to home
        </Link>
      </CardContent>
    </Card>
  );
}
