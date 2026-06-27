import { Check, Zap } from "lucide-react";
import { HashSafeLink } from "@/components/hash-safe-link";

const AVATARS = [
  { initials: "JM", bg: "#2E7D52" },
  { initials: "AK", bg: "#5a7a9a" },
  { initials: "RL", bg: "#8b6b4a" },
  { initials: "TC", bg: "#6b5b95" },
] as const;

export function LandingHeroRedesign({
  primaryHref,
  secondaryHref,
  primaryLabel,
  secondaryLabel,
}: {
  primaryHref: string;
  secondaryHref: string;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <section id="product" className="dh-hero">
      <div className="dh-hero-grid">
        <div>
          <div className="dh-hero-badge">
            <span className="dh-hero-badge-dot" aria-hidden />
            B2B prospecting for dental marketers
          </div>
          <h1>
            150 Scored Dental Leads, <em>Delivered With a Pitch Angle for Each One.</em>
          </h1>
          <p className="dh-hero-lead">
            Stop cold-guessing. Know why each practice needs you — and what to say — before you ever reach out.
          </p>
          <div className="dh-hero-ctas">
            <HashSafeLink href={primaryHref} className="dh-btn-primary">
              {primaryLabel}
            </HashSafeLink>
            <HashSafeLink href={secondaryHref} className="dh-btn-ghost">
              {secondaryLabel}
            </HashSafeLink>
          </div>
          <div className="dh-social-proof">
            <div className="dh-avatars" aria-hidden>
              {AVATARS.map((a) => (
                <span key={a.initials} className="dh-avatar" style={{ background: a.bg }}>
                  {a.initials}
                </span>
              ))}
            </div>
            <span className="dh-social-text">Used by 200+ dental marketers and agencies</span>
          </div>
          <p className="dh-hero-micro">
            Built for marketers, agencies, and lead gen operators targeting dental practices.
          </p>
        </div>

        <div className="dh-hero-visual" aria-hidden>
          <div className="dh-stack-card dh-stack-card--back">Bright Smile Dental</div>
          <div className="dh-stack-card dh-stack-card--mid">West Valley Dental Group</div>

          <div className="dh-lead-card-wrap">
            <article className="dh-lead-card">
              <div className="dh-lead-card-header">
                <div>
                  <div className="dh-lead-card-title">Dentists at Midtown</div>
                  <div className="dh-lead-card-city">Miami, FL</div>
                </div>
                <div className="dh-score-badge">76</div>
              </div>
              <span className="dh-tag-pill dh-tag-pill--amber">⚑ Reputation Gap</span>
              <div className="dh-signal-row">
                <span className="dh-signal-dot" />
                <span>469 reviews · 4.2★ public rating</span>
              </div>
              <div className="dh-signal-row">
                <span className="dh-signal-dot" />
                <span>Rating likely filtering high-intent local searches</span>
              </div>
              <div className="dh-signal-row">
                <span className="dh-signal-dot" />
                <span>Contact form · Tier 1: Ready to Contact</span>
              </div>
              <hr className="dh-lead-divider" />
              <div className="dh-lead-footer">
                <span className="dh-lead-footer-label">Est. opportunity</span>
                <span className="dh-lead-footer-value">
                  $3k–$12k/mo
                  <br />
                  Contact Form
                </span>
              </div>
            </article>
          </div>

          <div className="dh-float-badge dh-float-badge--leads">
            <Check size={14} strokeWidth={2.5} aria-hidden />
            150 scored leads ready
          </div>
          <div className="dh-float-badge dh-float-badge--outreach">
            <Zap size={14} fill="currentColor" aria-hidden />
            Same-day outreach
          </div>
        </div>
      </div>
    </section>
  );
}
