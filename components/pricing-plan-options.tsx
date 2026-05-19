"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { HowToUsePack } from "@/components/how-to-use-pack";
import { buttonVariants } from "@/lib/button-variants";
import { QUALITY_REPLACEMENT_NOTE, SITE } from "@/lib/site-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Plan = "starter" | "pro";

export function PricingPlanOptions() {
  const { data: session } = useSession();
  const [plan, setPlan] = useState<Plan>("starter");
  const [loading, setLoading] = useState<Plan | null>(null);

  const startCheckout = useCallback(
    async (selected: Plan) => {
      if (!session?.user) {
        window.location.href = `/login?next=/pricing&plan=${selected}`;
        return;
      }
      setLoading(selected);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: selected }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Checkout failed");
        if (data.url) window.location.href = data.url;
      } catch (e) {
        alert(e instanceof Error ? e.message : "Checkout failed");
      } finally {
        setLoading(null);
      }
    },
    [session]
  );

  return (
    <div className="w-full">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-slate-900">Your dental outreach pipeline. Every month.</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Close one client and your subscription pays for itself 30×. Most members close within their first pack.
        </p>
      </div>

      <div
        className="mx-auto mt-8 flex max-w-md flex-col gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm sm:flex-row"
        role="tablist"
        aria-label="Pricing plan"
      >
        <button
          type="button"
          role="tab"
          aria-selected={plan === "starter"}
          className={cn(
            "min-h-[44px] flex-1 rounded-full px-4 text-sm font-semibold transition-all",
            plan === "starter" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          )}
          onClick={() => setPlan("starter")}
        >
          Starter Pack
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={plan === "pro"}
          className={cn(
            "min-h-[44px] flex-1 rounded-full px-4 text-sm font-semibold transition-all",
            plan === "pro" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
          )}
          onClick={() => setPlan("pro")}
        >
          Pro — $99/mo
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 md:items-stretch">
        <Card
          className={cn(
            "flex flex-col transition-all",
            plan === "starter"
              ? "border-2 border-slate-900 shadow-lg md:scale-[1.02]"
              : "border border-slate-200 opacity-80 md:scale-[0.99]"
          )}
        >
          <CardHeader>
            <CardTitle className="text-xl">Starter Pack</CardTitle>
            <CardDescription>One-time · entry product</CardDescription>
            <p className="text-3xl font-bold text-slate-900">$49</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4 text-sm text-slate-700">
            <ul className="space-y-2">
              <li>✓ {SITE.leadPackCount} leads, one market</li>
              <li>✓ CSV download</li>
              <li>✓ Scored priorities + outreach drafts</li>
            </ul>
            <p className="text-xs text-slate-500">{QUALITY_REPLACEMENT_NOTE}</p>
            <HowToUsePack className="rounded-lg border border-slate-100 bg-slate-50/80 p-4" />
            <div className="mt-auto pt-2">
              <button
                type="button"
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
                onClick={() => startCheckout("starter")}
                disabled={loading !== null}
              >
                {loading === "starter" ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Buy one pack"}
              </button>
              <Link href="/search" className="mt-2 block text-center text-xs text-slate-600 underline">
                Or preview a market first
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "relative flex flex-col transition-all",
            plan === "pro"
              ? "border-2 border-blue-700 shadow-xl ring-2 ring-blue-700/15 md:scale-[1.02]"
              : "border border-slate-200 opacity-80 md:scale-[0.99]"
          )}
        >
          <span className="absolute right-3 top-3 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase text-blue-800">
            Best value
          </span>
          <CardHeader className="pt-10">
            <CardTitle className="text-xl">Dentily Pro</CardTitle>
            <CardDescription>Living pipeline · cancel anytime</CardDescription>
            <p className="text-3xl font-bold text-slate-900">
              $99<span className="text-lg font-semibold text-slate-600">/mo</span>
            </p>
            <p className="text-xs text-slate-600">$3k–$20k/mo estimated practice opportunity per lead</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4 text-sm text-slate-700">
            <ul className="space-y-2">
              <li>✓ 150 leads/mo (3 searches × 50)</li>
              <li>✓ De-duplication across months</li>
              <li>✓ CRM contact status per lead</li>
              <li>✓ Unlimited markets</li>
              <li>✓ Dashboard + CSV exports</li>
            </ul>
            <div className="mt-auto pt-2">
              <button
                type="button"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full border-blue-700 bg-blue-700 hover:bg-blue-800"
                )}
                onClick={() => startCheckout("pro")}
                disabled={loading !== null}
              >
                {loading === "pro" ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  "Start Pro — $99/mo"
                )}
              </button>
              <Link href="/dashboard" className="mt-2 block text-center text-xs text-slate-600 underline">
                Go to dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-10 max-w-3xl overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-500">
              <th className="py-2 pr-4" />
              <th className="py-2 pr-4">Starter</th>
              <th className="py-2">Pro</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Price", "$49 one-time", "$99/mo"],
              ["Leads", "50, one market", "150/mo (3 searches)"],
              ["Refresh", "Never", "Each billing cycle"],
              ["De-duplication", "—", "✓"],
              ["CRM tracking", "—", "✓"],
              ["Markets", "1", "Unlimited"],
            ].map(([label, starter, pro]) => (
              <tr key={label} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium text-slate-900">{label}</td>
                <td className="py-2 pr-4">{starter}</td>
                <td className="py-2">{pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
