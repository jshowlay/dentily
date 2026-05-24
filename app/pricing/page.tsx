import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { PricingFaq } from "@/components/pricing-faq";
import { PricingHowToUse } from "@/components/pricing/pricing-how-to-use";
import { PricingSection } from "@/components/pricing-section";
import "@/app/pricing-page.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Get 50 scored dental practice leads for $49 one-time. Instant CSV download. Built for agencies and freelancers.",
};

export default function PricingPage() {
  return (
    <div className="dentily-pricing">
      <SiteHeader homeStyle />

      <header className="dp-hero">
        <span className="dp-badge">Pricing</span>
        <h1>
          Simple pricing, <em>real results</em>
        </h1>
        <p className="dp-hero-sub">
          One-time $49 per market — close one client and the pack pays for itself many times over.
        </p>
        <p className="dp-trust-pill">
          <span className="dp-trust-dot" aria-hidden />
          No subscription · instant access · keep your export forever
        </p>
      </header>

      <PricingSection enableCheckout hideIntro />

      <PricingHowToUse />

      <PricingFaq layout="grid" />
    </div>
  );
}
