import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SearchForm } from "@/components/search-form";
import { SITE } from "@/lib/site-config";

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="w-full border-b border-white/10 bg-black py-4 text-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex flex-col gap-0.5 text-white no-underline hover:opacity-95">
            <BrandMark />
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/" className="text-white/90 underline-offset-4 hover:underline">
              Home
            </Link>
            <Link href="/pricing" className="text-white/90 underline-offset-4 hover:underline">
              Pricing
            </Link>
          </div>
        </div>
      </header>
      <section className="container-page flex min-h-[calc(100vh-64px)] items-center justify-center py-12">
        <div className="w-full max-w-xl">
          <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Choose your area
          </h1>
          <p className="mb-8 text-center text-slate-600">
            We surface local dental practices, score them for growth potential, and draft outreach you can use for
            implants, cosmetic, Invisalign, and more.
          </p>
          <div className="flex justify-center">
            <SearchForm
              defaultNiche="dentists"
              cardTitle="Target market"
              cardDescription={`Pick a city or region. We build up to ${SITE.leadPackCount} scored practices with priorities and outreach — unlock the CSV when you are ready.`}
              submitLabel={SITE.primaryCta}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
