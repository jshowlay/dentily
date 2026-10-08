"use client";

import { FormEvent, useMemo, useState } from "react";
import { AdminSampleShell } from "@/components/admin/admin-sample-shell";
import {
  cityLabelFromLocation,
  priorityClass,
  scoreBadgeClass,
  signalIcon,
} from "@/components/results/results-utils";
import { ADMIN_SAMPLE_RESULT_LIMIT } from "@/lib/admin-sample-config";
import type { AdminSampleLead } from "@/lib/admin-sample-format";
import { formatAdminSampleEmailBullets } from "@/lib/admin-sample-format";

type GenerateResponse = {
  market: string;
  leads: AdminSampleLead[];
  emailCopy: string;
};

function tierPriorityClass(tier: string): string {
  const t = tier.toLowerCase();
  if (t === "high" || t === "medium" || t === "low") return priorityClass(t);
  return "is-medium";
}

export function AdminSampleClient() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [copiedTop3, setCopiedTop3] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const stats = useMemo(() => {
    if (!result?.leads.length) return null;
    const high = result.leads.filter((l) => l.tier.toLowerCase() === "high").length;
    const scores = result.leads.map((l) => l.score).filter((s) => Number.isFinite(s));
    const avg =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return { count: result.leads.length, high, avg };
  }, [result]);

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

  async function copyTop3() {
    if (!result?.emailCopy) return;
    await navigator.clipboard.writeText(result.emailCopy);
    setCopiedTop3(true);
    window.setTimeout(() => setCopiedTop3(false), 2000);
  }

  async function copyAll10() {
    if (!result?.leads.length) return;
    const text = formatAdminSampleEmailBullets(result.leads, result.leads.length);
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 2000);
  }

  return (
    <AdminSampleShell>
      <p className="dr-crumb">Admin · sample leads · no checkout</p>
      <h1 className="dr-title dr-serif">
        Outreach <em>sample leads</em>
      </h1>
      <p className="dr-subtitle">
        Live Google listings, evidence-based scoring, and a light website crawl for contact paths (no ZeroBounce or
        Apollo). Returns the top {ADMIN_SAMPLE_RESULT_LIMIT} independent practices.
      </p>

      <div className="dentily-search is-embedded mt-6 max-w-2xl">
        <form onSubmit={onGenerate} className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px] flex-1">
            <label className="ds-field-label" htmlFor="sample-city">
              City
            </label>
            <div className="ds-input-wrap">
              <input
                id="sample-city"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin"
                disabled={loading}
              />
            </div>
          </div>
          <div className="w-28">
            <label className="ds-field-label" htmlFor="sample-state">
              State
            </label>
            <div className="ds-input-wrap">
              <input
                id="sample-state"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="TX"
                maxLength={40}
                className="uppercase"
                disabled={loading}
              />
            </div>
          </div>
          <button type="submit" className="ds-submit shrink-0" disabled={loading}>
            {loading ? "Building pack…" : `Generate top ${ADMIN_SAMPLE_RESULT_LIMIT}`}
          </button>
        </form>
      </div>

      {error ? (
        <div className="dr-alert is-error mt-6" role="alert">
          {error}
        </div>
      ) : null}

      {result && stats ? (
        <>
          <div className="dr-stats !mt-4">
            <div className="dr-stat">
              <div className="dr-stat-value">{stats.count}</div>
              <div className="dr-stat-label">Practices</div>
            </div>
            <div className="dr-stat">
              <div className="dr-stat-value">{stats.high}</div>
              <div className="dr-stat-label">High priority</div>
            </div>
            <div className="dr-stat">
              <div className="dr-stat-value">{stats.avg ?? "—"}</div>
              <div className="dr-stat-label">Avg score</div>
            </div>
            <div className="dr-stat">
              <div className="dr-stat-value">{cityLabelFromLocation(result.market)}</div>
              <div className="dr-stat-label">Market</div>
            </div>
          </div>

          <div className="dr-toolbar">
            <h2 className="m-0 text-base font-medium text-[var(--color-ink)]">{result.market}</h2>
            <span className="dr-toolbar-spacer" />
            <button type="button" className="dr-copy-btn" onClick={copyTop3}>
              {copiedTop3 ? "Copied!" : "Copy for email (top 3)"}
            </button>
            <button type="button" className="dr-copy-btn" onClick={copyAll10}>
              {copiedAll ? "Copied!" : "Copy all 10"}
            </button>
          </div>

          <div className="dr-table-wrap">
            <div className="dr-table-scroll">
              <table className="dr-table">
                <thead>
                  <tr>
                    <th>Practice</th>
                    <th>Score</th>
                    <th>Priority</th>
                    <th>Signal</th>
                    <th>Why this lead</th>
                    <th>Contact</th>
                    <th>Pitch angle</th>
                  </tr>
                </thead>
                <tbody>
                  {result.leads.map((lead) => (
                    <tr key={lead.name} className="dr-row">
                      <td>
                        <div className="dr-practice-name" title={lead.name}>
                          {lead.name}
                        </div>
                        {lead.address ? (
                          <div className="dr-practice-city">{lead.address}</div>
                        ) : null}
                      </td>
                      <td>
                        <span className={`dr-score ${scoreBadgeClass(lead.score)}`}>{lead.score}</span>
                      </td>
                      <td>
                        <span className={`dr-priority ${tierPriorityClass(lead.tier)}`}>
                          <span className="dr-priority-dot" aria-hidden />
                          {lead.tier}
                        </span>
                      </td>
                      <td>
                        <span className="dr-signal">
                          {signalIcon(lead.opportunityType)} {lead.opportunityType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <span className="dr-signal">{lead.whyThisLead}</span>
                      </td>
                      <td>
                        <span className="dr-contact">{lead.bestContactMethod}</span>
                      </td>
                      <td>
                        <span className="dr-signal">{lead.pitchAngle}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </AdminSampleShell>
  );
}
