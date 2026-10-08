import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { PricingFaq } from "@/components/pricing-faq";
import { PricingHowToUse } from "@/components/pricing/pricing-how-to-use";
import { PricingSection } from "@/components/pricing-section";
import "@/app/pricing-page.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Get up to 150 scored dental practice leads for $99 one-time. Instant CSV download. Built for agencies and freelancers.",
};

type PricingPageProps = {
  searchParams?: { searchId?: string };
};

export default function PricingPage({ searchParams }: PricingPageProps) {
  const searchId = searchParams?.searchId ?? null;
  return (
    <div className="dentily-pricing">
      <SiteHeader homeStyle />

      <header className="dp-hero">
        <span className="dp-badge">Pricing</span>
        <h1>
          Simple pricing, <em>real results</em>
        </h1>
        <p className="dp-hero-sub">
          One-time $99 per market — close one client and the pack pays for itself many times over.
        </p>
        <p className="dp-trust-pill">
          <span className="dp-trust-dot" aria-hidden />
          No subscription · instant access · keep your export forever
        </p>
      </header>

      <PricingSection hideIntro searchId={searchId} />

      <PricingHowToUse />

      <PricingFaq layout="grid" />
    </div>
  );
}
