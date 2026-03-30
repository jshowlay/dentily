import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MarketSearchPreview } from "@/components/market-search-preview";
import { SearchForm } from "@/components/search-form";
import { POSITIONING, SITE } from "@/lib/site-config";

const EXAMPLE_MARKETS = [
  { label: "Los Angeles", location: "Los Angeles, CA" },
  { label: "Dallas", location: "Dallas, TX" },
  { label: "Miami", location: "Miami, FL" },
  { label: "Phoenix", location: "Phoenix, AZ" },
];

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="w-full border-b border-white/10 bg-black py-4 text-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex flex-col gap-0.5 text-white no-underline hover:opacity-95">
            <BrandMark />
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/#how-it-works" className="text-white/90 underline-offset-4 hover:underline">
              How it works
            </Link>
            <Link href="/pricing" className="text-white/90 underline-offset-4 hover:underline">
              Pricing
            </Link>
            <Link href="/" className="text-white/90 underline-offset-4 hover:underline">
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="container-page py-10 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{POSITIONING.searchHeadline}</h1>
          <p className="mt-4 text-lg text-slate-600">{POSITIONING.searchSubheadline}</p>
          <p className="mt-3 text-sm text-slate-500">
            Output: scored <span className="font-medium text-slate-700">dental practice records</span> for B2B outreach
            — not consumer patient lists.
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-xl flex-col gap-10">
          <SearchForm
            defaultNiche="dentists"
            hideNicheField
            cardTitle="Location"
            cardDescription="We search public dental practice listings in that area, then score and prioritize them for your outreach."
            submitLabel={SITE.primaryCta}
            exampleMarkets={EXAMPLE_MARKETS}
          />
          <MarketSearchPreview />
          <p className="text-center text-xs text-slate-500">
            One-time pack unlock after checkout. No long-term contract for the standard offer.
          </p>
        </div>
      </section>
    </main>
  );
}
