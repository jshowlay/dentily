"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/lib/button-variants";
import { ADMIN_SAMPLE_RESULT_LIMIT } from "@/lib/admin-sample-config";
import type { AdminSampleLead } from "@/lib/admin-sample-run";
import { cn } from "@/lib/utils";

type GenerateResponse = {
  market: string;
  leads: AdminSampleLead[];
  emailCopy: string;
};

export function AdminSampleClient() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function onGenerate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ city, state }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Generation failed.");
      }
      setResult(data as GenerateResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function copyEmailBullets() {
    if (!result?.emailCopy) return;
    await navigator.clipboard.writeText(result.emailCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="text-white no-underline">
            <BrandMark variant="admin" />
          </Link>
          <p className="text-sm text-white/60">Free sample generator · no checkout</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Outreach sample leads</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          Pulls live Google listings, scores the market, runs a light website crawl for contact paths (no ZeroBounce or
          Apollo), and returns the top {ADMIN_SAMPLE_RESULT_LIMIT} independent practices (no chains or generic listings).
        </p>

        <form onSubmit={onGenerate} className="mt-8 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-white/80" htmlFor="sample-city">
              City
            </label>
            <input
              id="sample-city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Austin"
              className="mt-1 w-48 rounded-md border border-white/20 bg-white/5 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80" htmlFor="sample-state">
              State
            </label>
            <input
              id="sample-state"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="TX"
              maxLength={40}
              className="mt-1 w-24 rounded-md border border-white/20 bg-white/5 px-3 py-2 uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={cn(buttonVariants({ size: "default" }), "bg-white text-slate-900 hover:bg-slate-100")}
          >
            {loading ? "Building pack…" : `Generate top ${ADMIN_SAMPLE_RESULT_LIMIT}`}
          </button>
        </form>

        {error ? (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium">{result.market}</h2>
              <button
                type="button"
                onClick={copyEmailBullets}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-9 px-3 text-xs",
                  "border-white/30 text-white hover:bg-white/10"
                )}
              >
                {copied ? "Copied" : "Copy for email (top 3)"}
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase text-white/60">
                  <tr>
                    <th className="px-4 py-3">Practice</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Why this lead</th>
                    <th className="px-4 py-3">Best contact</th>
                    <th className="px-4 py-3">Pitch angle</th>
                  </tr>
                </thead>
                <tbody>
                  {result.leads.map((lead) => (
                    <tr key={lead.name} className="border-t border-white/10 align-top">
                      <td className="px-4 py-3 font-medium">{lead.name}</td>
                      <td className="px-4 py-3 tabular-nums">{lead.score}</td>
                      <td className="px-4 py-3 capitalize">{lead.tier}</td>
                      <td className="max-w-xs px-4 py-3 text-white/85">{lead.whyThisLead}</td>
                      <td className="px-4 py-3">{lead.bestContactMethod}</td>
                      <td className="max-w-md px-4 py-3 text-white/85">{lead.pitchAngle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
