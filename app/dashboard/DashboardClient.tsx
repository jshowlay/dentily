"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import {
  LEAD_CRM_STATUSES,
  type DashboardLead,
  type DashboardSearch,
  type LeadCrmStatus,
  type SubscriptionRow,
} from "@/lib/subscription-types";
import { SITE } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<LeadCrmStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-amber-100 text-amber-900",
  replied: "bg-blue-100 text-blue-900",
  booked: "bg-indigo-100 text-indigo-900",
  won: "bg-green-100 text-green-900",
  not_a_fit: "bg-slate-200 text-slate-600",
};

const MONTHLY_CREDITS = 3;

type DashboardClientProps = {
  user: { id: string; email: string; name: string | null };
  subscription: SubscriptionRow | null;
  searches: DashboardSearch[];
};

export function DashboardClient({ user, subscription, searches: initialSearches }: DashboardClientProps) {
  const router = useRouter();
  const [searches, setSearches] = useState(initialSearches);
  const [niche, setNiche] = useState("Dentists");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSearchId, setExpandedSearchId] = useState<number | null>(
    initialSearches[0]?.id ?? null
  );
  const [checkoutLoading, setCheckoutLoading] = useState<"pro" | "starter" | null>(null);

  const credits = subscription?.creditsRemaining ?? 0;
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const canSearch = isActive && credits > 0;
  const creditsUsed = Math.max(0, MONTHLY_CREDITS - credits);
  const progressPct = subscription?.plan === "pro" ? (creditsUsed / MONTHLY_CREDITS) * 100 : 0;

  const planLabel = useMemo(() => {
    if (!subscription || !isActive) return "No active plan";
    if (subscription.plan === "pro") return "Dentily Pro";
    return "Starter Pack";
  }, [subscription, isActive]);

  const billingDate = subscription?.billingCycleStart
    ? new Date(subscription.billingCycleStart).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const startCheckout = useCallback(async (plan: "pro" | "starter") => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCheckoutLoading(null);
    }
  }, []);

  const openPortal = useCallback(async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (res.ok && data.url) window.location.href = data.url;
    else setError(data.error ?? "Could not open billing portal");
  }, []);

  const runSearch = useCallback(async () => {
    if (!canSearch) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ niche, location, useCredits: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Search failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [canSearch, niche, location, router]);

  const updateLeadStatus = useCallback(
    async (leadId: number, status: LeadCrmStatus) => {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      setSearches((prev) =>
        prev.map((s) => ({
          ...s,
          leads: s.leads.map((l) => (l.id === leadId ? { ...l, crmStatus: status } : l)),
        }))
      );
    },
    []
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav creditsRemaining={isActive ? credits : null} />

      <div className="container-page space-y-8 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your pipeline</h1>
            <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {subscription?.plan === "pro" && isActive && (
              <Link
                href="/dashboard/outreach"
                className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center")}
              >
                AI outreach
              </Link>
            )}
            <Button type="button" variant="outline" onClick={() => openPortal()}>
              Manage billing
            </Button>
            <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </Button>
          </div>
        </div>

        {!isActive && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold text-amber-950">Unlock your first lead pack</p>
                <p className="mt-1 text-sm text-amber-900/80">
                  $49 one-time — 50 scored practices per market with outreach drafts and CSV export.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={checkoutLoading !== null}
                  onClick={() => startCheckout("starter")}
                >
                  {checkoutLoading === "starter" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Get leads — $49"
                  )}
                </Button>
                <Link href="/search" className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center")}>
                  Run a search
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {isActive && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Search credits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{credits}</span> search
                {credits === 1 ? "" : "es"} remaining this month
                {subscription?.plan === "pro" && billingDate ? ` · cycle started ${billingDate}` : ""}
              </p>
              {subscription?.plan === "pro" && (
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all"
                    style={{ width: `${Math.min(100, progressPct)}%` }}
                  />
                </div>
              )}
              {credits === 0 && (
                <Link href="/pricing" className={cn(buttonVariants({ size: "default" }), "inline-flex text-sm")}>
                  Upgrade or wait for renewal
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run a search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Niche</label>
                <Input value={niche} onChange={(e) => setNiche(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Location</label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Austin, TX"
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              type="button"
              disabled={!canSearch || loading || location.trim().length < 2}
              onClick={runSearch}
              title={!canSearch ? "No credits remaining" : undefined}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {SITE.searchSubmitLoading}
                </>
              ) : (
                "Run search"
              )}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Past searches</h2>
          {searches.length === 0 ? (
            <p className="text-sm text-slate-600">No searches yet. Run your first market above.</p>
          ) : (
            searches.map((search) => (
              <SearchCard
                key={search.id}
                search={search}
                expanded={expandedSearchId === search.id}
                onToggle={() =>
                  setExpandedSearchId((id) => (id === search.id ? null : search.id))
                }
                onStatusChange={updateLeadStatus}
              />
            ))
          )}
        </section>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Plan:</span> {planLabel}
            </p>
            {subscription?.plan === "pro" && isActive && (
              <p className="mt-2">
                <button type="button" className="font-medium text-slate-900 underline" onClick={openPortal}>
                  Cancel or change plan
                </button>{" "}
                in the Stripe customer portal.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function SearchCard({
  search,
  expanded,
  onToggle,
  onStatusChange,
}: {
  search: DashboardSearch;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (leadId: number, status: LeadCrmStatus) => void;
}) {
  const date = new Date(search.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">
            {search.location} · {search.leadCount} leads
          </CardTitle>
          <p className="text-xs text-slate-500">
            {search.niche} · {date}
          </p>
        </div>
        <div className="flex gap-2">
          {search.isPaid && (
            <a
              href={`/api/search/${search.id}/export`}
              className={cn(buttonVariants({ variant: "outline", size: "default" }), "text-sm px-3 py-1.5")}
            >
              Download CSV
            </a>
          )}
          <Button type="button" variant="outline" size="default" onClick={onToggle}>
            {expanded ? "Hide leads" : "View leads"}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-slate-500">
                <th className="py-2 pr-2">Score</th>
                <th className="py-2 pr-2">Practice</th>
                <th className="py-2 pr-2">Signal</th>
                <th className="py-2 pr-2">Contact</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2">Pitch</th>
              </tr>
            </thead>
            <tbody>
              {search.leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} onStatusChange={onStatusChange} />
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}

function LeadRow({
  lead,
  onStatusChange,
}: {
  lead: DashboardLead;
  onStatusChange: (leadId: number, status: LeadCrmStatus) => void;
}) {
  const [showPitch, setShowPitch] = useState(false);
  const contact =
    lead.primaryEmail ??
    (lead.contactFormUrl ? "Contact form" : null) ??
    lead.phone ??
    "—";

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="py-2 pr-2 font-medium">{lead.score ?? "—"}</td>
      <td className="py-2 pr-2">{lead.name}</td>
      <td className="py-2 pr-2 text-xs text-slate-600">{lead.opportunityType ?? lead.priority ?? "—"}</td>
      <td className="py-2 pr-2 text-xs">{contact}</td>
      <td className="py-2 pr-2">
        <select
          value={lead.crmStatus}
          onChange={(e) => onStatusChange(lead.id, e.target.value as LeadCrmStatus)}
          className={cn(
            "rounded-md border-0 px-2 py-1 text-xs font-medium",
            STATUS_COLORS[lead.crmStatus]
          )}
        >
          {LEAD_CRM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2">
        {lead.outreach ? (
          <div>
            <button
              type="button"
              className="text-xs font-medium text-slate-700 underline"
              onClick={() => setShowPitch((v) => !v)}
            >
              {showPitch ? "Hide" : "Show"} pitch
            </button>
            {showPitch && (
              <div className="mt-1 flex gap-1">
                <p className="max-w-xs text-xs text-slate-600">{lead.outreach}</p>
                <CopyButton value={lead.outreach} />
              </div>
            )}
          </div>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
