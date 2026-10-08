import Link from "next/link";
import { SITE } from "@/lib/site-config";
import "@/app/pricing-page.css";

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

/** CTA from /pricing — return to an in-progress preview when searchId is present. */
export function pricingGetStartedHref(searchId: string | null | undefined): string {
  const raw = (searchId ?? "").trim();
  if (/^\d+$/.test(raw)) {
    return `/results?searchId=${encodeURIComponent(raw)}`;
  }
  return "/search";
}

type PricingSectionProps = {
  /** Hide section intro (page supplies its own hero). */
  hideIntro?: boolean;
  /** Show bottom tip — landing only. */
  showFooterTip?: boolean;
  /** Override display price label (e.g. from landing constants). */
  priceLabel?: string;
  /** Override lead count in feature list (e.g. from landing constants). */
  leadCount?: number;
  /** When set (e.g. from /pricing?searchId=), "Get started" returns to results checkout. */
  searchId?: string | null;
};

export function PricingSection({
  hideIntro = false,
  showFooterTip = false,
  priceLabel = SITE.leadPackPriceLabel,
  leadCount = SITE.leadPackCount,
  searchId = null,
}: PricingSectionProps) {
  const ctaHref = pricingGetStartedHref(searchId);
  const starterPlan = {
    tierLabel: "STARTER",
    price: priceLabel,
    billing: "One-time · no subscription",
    tagline: "Test one market before committing to a pipeline.",
    cta: "Get started",
    ctaHref,
    features: [
      `Up to ${leadCount} scored dental practices`,
      "Priority tiers + numeric scores",
      "Why-this-lead rationale per row",
      "Best contact path per lead",
      "Ready-to-use outreach drafts",
      "CSV download, instant access",
    ],
  } as const;

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
            One market, one pack — scored, pitch-ready dental leads for {starterPlan.price}.
          </p>
        </div>
      ) : null}

      <div className="dp-grid dp-grid--single">
        <article className="dp-card">
          <p className="dp-tier">{starterPlan.tierLabel}</p>

          <div className="dp-price-row">
            <span className="dp-price">{starterPlan.price}</span>
          </div>

          <p className="dp-billing">{starterPlan.billing}</p>
          <p className="dp-tagline">{starterPlan.tagline}</p>

          <div className="dp-features">
            {starterPlan.features.map((f) => (
              <FeatureCheck key={f} text={f} />
            ))}
          </div>

          <Link href={starterPlan.ctaHref} className="dp-cta is-ghost">
            {starterPlan.cta} →
          </Link>
        </article>
      </div>

      {showFooterTip ? (
        <div className="dp-tip">
          <div className="dp-tip-inner">
            <strong>Not sure where to start?</strong> Run a search for your first market, review the sample results,
            then unlock the full pack for {starterPlan.price}.{" "}
            <Link href="/search">Preview a market first</Link>.
          </div>
        </div>
      ) : null}
    </section>
  );
}
