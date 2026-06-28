"use client";

import Link from "next/link";
import { HOW_TO_USE_PACK_STEPS, SITE } from "@/lib/site-config";
import "@/app/success-page.css";

export type SuccessPackSummary = {
  searchId: number;
  location: string;
  totalCount: number;
  highPriorityCount: number;
};

export type SuccessOutcome =
  | { kind: "no_session" }
  | { kind: "ok"; searchId: number }
  | { kind: "error"; message: string };

const UNLOCKED_FEATURES = [
  "Full contact paths — phone, email, or contact form per lead",
  'Priority tiers + numeric scores with "why this lead" rationale',
  "Estimated monthly opportunity range per practice",
  "CSV download available now — no expiry",
] as const;

type Props = {
  outcome: SuccessOutcome;
  packSummary?: SuccessPackSummary | null;
  sessionId?: string | null;
};

export function SuccessClient({ outcome, packSummary, sessionId }: Props) {
  const location = packSummary?.location?.trim() ?? "";
  const totalCount = packSummary?.totalCount ?? 0;
  const highPriority = packSummary?.highPriorityCount ?? 0;

  return (
    <div className="dentily-success">
      <header className="dsu-nav">
        <Link href="/" className="dsu-logo">
          Dentily
        </Link>
        <Link href="/" className="dsu-nav-link">
          ← Back to home
        </Link>
      </header>

      {outcome.kind === "ok" ? (
        <>
          <section className="dsu-hero">
            <div className="dsu-check-circle" aria-hidden>✓</div>
            <span className="dsu-pill">Payment confirmed</span>
            <h1 className="dsu-title dsu-serif">
              Your {location ? `${location} ` : ""}leads are <em>ready</em>
            </h1>
            <p className="dsu-subtitle">
              Check your email — we sent your pack and quick start guide to the address you used at checkout. You can
              also grab everything directly below.
            </p>
            <div className="dsu-actions">
              <Link href={`/results?searchId=${outcome.searchId}`} className="dsu-btn dsu-btn-primary">
                View your leads →
              </Link>
              <a
                href={`/api/search/${outcome.searchId}/export`}
                download
                className="dsu-btn dsu-btn-ghost"
              >
                ⬇ Download CSV
              </a>
              {sessionId ? (
                <a
                  href={`/api/download?session_id=${encodeURIComponent(sessionId)}`}
                  className="dsu-btn dsu-btn-ghost"
                >
                  Download Quick Start Guide
                </a>
              ) : null}
            </div>
            <p className="dsu-context">
              Search #{outcome.searchId}{location ? ` · ${location}` : ""}
            </p>
          </section>

          <div className="dsu-card-wrap">
            <div className="dsu-card">
              <p className="dsu-label">What you unlocked</p>
              <div className="dsu-stat-grid">
                <div className="dsu-stat">
                  <div className="dsu-stat-value">{totalCount || "—"}</div>
                  <div className="dsu-stat-label">Scored practices</div>
                </div>
                <div className="dsu-stat">
                  <div className="dsu-stat-value">{highPriority || "—"}</div>
                  <div className="dsu-stat-label">High priority</div>
                </div>
                <div className="dsu-stat">
                  <div className="dsu-stat-value">{totalCount || "—"}</div>
                  <div className="dsu-stat-label">Outreach drafts</div>
                </div>
              </div>
              <div className="dsu-divider" />
              {UNLOCKED_FEATURES.map((item) => (
                <div key={item} className="dsu-feature">
                  <span className="dsu-check" aria-hidden>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dsu-card-wrap">
            <div className="dsu-card">
              <p className="dsu-label">How to use this pack</p>
              <ol className="dsu-steps">
                {HOW_TO_USE_PACK_STEPS.map((step, i) => (
                  <li key={step} className="dsu-step">
                    <span className="dsu-step-num" aria-hidden>{i + 1}</span>
                    <span className="dsu-step-text">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="dsu-upsell">
            <div className="dsu-upsell-inner">
              <div>
                <h2>Ready for another market?</h2>
                <p>Each territory is a separate search. {SITE.leadPackPriceLabel} one-time per pack.</p>
              </div>
              <Link href="/search" className="dsu-upsell-btn">
                Get leads now →
              </Link>
            </div>
          </div>

          <p className="dsu-support">
            Questions about your file? Reply to your delivery email or reach us at hello@dentily.co — we&apos;ll help
            with good-faith data issues per our quality note on the pricing page.
          </p>
        </>
      ) : null}

      {outcome.kind === "no_session" ? (
        <div className="dsu-error-card">
          <div className="dsu-warn">
            <p className="dsu-label" style={{ marginBottom: 8 }}>
              Checkout session not in link
            </p>
            <p>
              If you already paid, open your results page and use <strong>Download CSV</strong> there — your pack may
              already be unlocked. Otherwise complete checkout from Stripe again so we can attach a session.
            </p>
            <div className="dsu-warn-actions">
              <Link href="/" className="dsu-btn dsu-btn-primary" style={{ maxWidth: "none", flex: "none" }}>
                Home
              </Link>
              <Link href="/search" className="dsu-btn dsu-btn-ghost" style={{ maxWidth: "none", flex: "none" }}>
                {SITE.primaryCta}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {outcome.kind === "error" ? (
        <div className="dsu-error-card">
          <div className="dsu-error-inner">
            <h1 className="dsu-serif">We could not confirm payment</h1>
            <p>{outcome.message}</p>
            <Link href="/" className="dsu-btn dsu-btn-ghost" style={{ maxWidth: "none", display: "inline-flex" }}>
              ← Back to home
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
