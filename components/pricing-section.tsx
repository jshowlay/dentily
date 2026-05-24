"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import "@/app/pricing-page.css";

const STARTER_PLAN = {
  tierLabel: "STARTER",
  price: "$49",
  billing: "One-time · no subscription",
  tagline: "Test one market before committing to a pipeline.",
  cta: "Get started",
  ctaHref: "/search",
  features: [
    "50 scored dental practices",
    "Priority tiers + numeric scores",
    "Why-this-lead rationale per row",
    "Best contact path per lead",
    "Ready-to-use outreach drafts",
    "CSV download, instant access",
  ],
} as const;

function FeatureCheck({ text }: { text: string }) {
  return (
    <div className="dp-feature">
      <span className="dp-icon-check" aria-hidden>
        ✓
      </span>
      <span>{text}</span>
    </div>
  );
}

type PricingSectionProps = {
  /** On /pricing — run Stripe one-time checkout after sign-in. */
  enableCheckout?: boolean;
  /** Hide section intro (page supplies its own hero). */
  hideIntro?: boolean;
  /** Show bottom tip — landing only. */
  showFooterTip?: boolean;
};

export function PricingSection({
  enableCheckout = false,
  hideIntro = false,
  showFooterTip = false,
}: PricingSectionProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const startCheckout = useCallback(async () => {
    if (!session?.user) {
      window.location.href = "/login?next=/pricing&plan=starter";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "starter" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }, [session]);

  const useStripeCheckout = enableCheckout;
  const CtaTag = useStripeCheckout ? "button" : "a";
  const ctaProps = useStripeCheckout
    ? { type: "button" as const, onClick: startCheckout, disabled: loading }
    : { href: STARTER_PLAN.ctaHref };

  return (
    <section id="pricing" className={hideIntro ? undefined : "dp-pricing-embed"}>
      {!hideIntro ? (
        <div style={{ marginBottom: 48, maxWidth: 1100, margin: "0 auto 48px", padding: "0 24px" }}>
          <p className="dp-tier" style={{ marginBottom: 10 }}>
            Pricing
          </p>
          <h2 className="dp-serif" style={{ fontSize: "clamp(26px, 4vw, 36px)", margin: "0 0 12px", lineHeight: 1.15 }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 16, color: "var(--color-muted)", margin: 0, maxWidth: 520, lineHeight: 1.6 }}>
            One market, one pack — scored, pitch-ready dental leads for {STARTER_PLAN.price}.
          </p>
        </div>
      ) : null}

      <div className="dp-grid dp-grid--single">
        <article className="dp-card">
          <p className="dp-tier">{STARTER_PLAN.tierLabel}</p>

          <div className="dp-price-row">
            <span className="dp-price">{STARTER_PLAN.price}</span>
          </div>

          <p className="dp-billing">{STARTER_PLAN.billing}</p>
          <p className="dp-tagline">{STARTER_PLAN.tagline}</p>

          <div className="dp-features">
            {STARTER_PLAN.features.map((f) => (
              <FeatureCheck key={f} text={f} />
            ))}
          </div>

          <CtaTag {...ctaProps} className="dp-cta is-ghost">
            {loading ? (
              <Loader2 size={18} className="mx-auto animate-spin" aria-label="Loading" />
            ) : (
              `${STARTER_PLAN.cta} →`
            )}
          </CtaTag>
        </article>
      </div>

      {showFooterTip ? (
        <div className="dp-tip">
          <div className="dp-tip-inner">
            <strong>Not sure where to start?</strong> Run a search for your first market, review the sample results,
            then unlock the full pack for {STARTER_PLAN.price}.{" "}
            <Link href="/search">Preview a market first</Link>.
          </div>
        </div>
      ) : null}
    </section>
  );
}
