"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { HowToUsePack } from "@/components/how-to-use-pack";
import { buttonVariants } from "@/lib/button-variants";
import { QUALITY_REPLACEMENT_NOTE, SITE } from "@/lib/site-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Monthly CTA uses NEXT_PUBLIC_STRIPE_MONTHLY_LINK — set in .env.local (see .env.example).
// TODO: replace placeholder in .env.local with your live Stripe Payment Link when ready.
const monthlyPlanUrl = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_LINK || "#monthly-plan";

type Plan = "one-time" | "monthly";

export function PricingPlanOptions() {
  const [plan, setPlan] = useState<Plan>("one-time");

  const openMonthlyTab = useCallback(() => setPlan("monthly"), []);
  const openOneTimeTab = useCallback(() => setPlan("one-time"), []);

  const onToggleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        openMonthlyTab();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        openOneTimeTab();
      }
    },
    [openMonthlyTab, openOneTimeTab]
  );

  const monthlyOpensNewTab = /^https?:\/\//i.test(monthlyPlanUrl);

  return (
    <div className="w-full">
      <div
        className="mx-auto flex max-w-md flex-col gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm transition-shadow duration-200 focus-within:ring-2 focus-within:ring-slate-900/15 sm:flex-row sm:items-center sm:justify-center"
        role="tablist"
        aria-label="Pricing plan"
        onKeyDown={onToggleKeyDown}
      >
        <button
          type="button"
          role="tab"
          id="tab-one-time"
          aria-controls="panel-one-time"
          aria-selected={plan === "one-time"}
          tabIndex={0}
          className={cn(
            "min-h-[44px] flex-1 rounded-full px-4 text-sm font-semibold outline-none transition-all duration-200",
            plan === "one-time"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
          onClick={openOneTimeTab}
        >
          One-Time
        </button>
        <button
          type="button"
          role="tab"
          id="tab-monthly"
          aria-controls="panel-monthly"
          aria-selected={plan === "monthly"}
          tabIndex={0}
          className={cn(
            "min-h-[44px] flex-1 rounded-full px-4 text-sm font-semibold outline-none transition-all duration-200",
            plan === "monthly"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
          onClick={openMonthlyTab}
        >
          Monthly — Save $10
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 md:items-stretch">
        <Card
          id="panel-one-time"
          role="tabpanel"
          aria-labelledby="tab-one-time"
          className={cn(
            "flex flex-col transition-all duration-200 ease-out",
            plan === "one-time"
              ? "z-[1] border-2 border-slate-900 shadow-lg ring-0 md:scale-[1.02]"
              : "border border-slate-200 bg-slate-50/60 opacity-75 shadow-sm md:scale-[0.99]"
          )}
        >
          <CardHeader>
            <CardTitle className="text-xl">One-Time Pack</CardTitle>
            <CardDescription className={plan === "monthly" ? "text-slate-500" : undefined}>
              One-time payment · USD · no subscription
            </CardDescription>
            <p className={cn("text-3xl font-bold", plan === "monthly" ? "text-slate-600" : "text-slate-900")}>
              {SITE.leadPackPriceLabel}
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-5">
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{SITE.leadPackCount} scored practices</span> with
              priority tiers, &quot;why this lead&quot; rationale, and outreach drafts — CSV export after checkout.
            </p>

            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="text-green-600">✓</span> High / medium / low priority labels
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span> Explainable score factors from listing data
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span> Phone, website, and Maps link when available
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span> Instant CSV download after payment
              </li>
            </ul>

            <p className="rounded-md border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600">
              <span className="font-medium text-slate-800">Quality:</span> {QUALITY_REPLACEMENT_NOTE}
            </p>
            <p className="text-center text-xs font-medium text-slate-600">
              Limited to one paid pack per search area to reduce overlap.
            </p>
            <HowToUsePack className="rounded-lg border border-slate-100 bg-slate-50/80 p-4" />

            <div className="mt-auto pt-2">
              <Link
                href="/search"
                className={cn(buttonVariants({ size: "lg" }), "flex h-11 w-full items-center justify-center")}
              >
                Get My Lead Pack
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card
          id="monthly-plan"
          role="tabpanel"
          aria-labelledby="tab-monthly"
          className={cn(
            "relative flex flex-col transition-all duration-200 ease-out",
            plan === "monthly"
              ? "z-[1] border-2 border-blue-700 shadow-xl ring-2 ring-blue-700/15 md:scale-[1.02]"
              : "border border-slate-200 bg-slate-50/60 opacity-75 shadow-sm md:scale-[0.99]"
          )}
        >
          <span className="absolute right-3 top-3 rounded-md border border-blue-100 bg-blue-50/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-800 md:text-xs">
            Best for agencies
          </span>
          <CardHeader className="pr-28 pt-10 md:pr-32">
            <CardTitle className="text-xl">Monthly Plan</CardTitle>
            <CardDescription>Fresh leads every month · cancel anytime</CardDescription>
            <p className={cn("text-3xl font-bold", plan === "monthly" ? "text-slate-900" : "text-slate-600")}>
              $39<span className="text-lg font-semibold text-slate-600">/month</span>
            </p>
            <p className="text-sm text-slate-600">Save $10 vs one-time</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="text-green-600">✓</span> Fresh {SITE.leadPackCount}-lead pack every month
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span> Pick a new market each month
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span> Priority email support
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span> Cancel anytime
              </li>
            </ul>
            <div className="mt-auto pt-2">
              <a
                href={monthlyPlanUrl}
                {...(monthlyOpensNewTab ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {})}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "flex min-h-[48px] w-full items-center justify-center border-blue-700 text-blue-800 hover:bg-blue-50"
                )}
              >
                Start Monthly Plan
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mx-auto mt-6 max-w-xl text-center text-xs text-slate-600 md:text-sm">
        Monthly plan billed at $39/mo via Stripe. Cancel anytime — no questions asked.
      </p>
    </div>
  );
}
