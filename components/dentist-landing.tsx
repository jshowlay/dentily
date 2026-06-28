import Link from "next/link";
import { HashSafeLink } from "@/components/hash-safe-link";
import { FeatureCard } from "@/components/landing/feature-card";
import { LandingHeroRedesign } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LiveSampleLeads } from "@/components/landing/live-sample-leads";
import { SectionHeader } from "@/components/landing/section-header";
import { SiteHeader } from "@/components/landing/site-header";
import { LandingSection } from "@/components/landing/section";
import { PricingFaq } from "@/components/pricing-faq";
import { PricingSection } from "@/components/pricing-section";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import "@/app/landing-home.css";

const FINAL_CTA = "Preview My Market Free";

const PROOF_CARDS = [
  {
    title: "Data-Backed Insights",
    body: "Each opportunity is built around visible growth gaps so your outreach is grounded in something real.",
  },
  {
    title: "Not Just Another Generic List",
    body: "Dentily is designed to surface specific opportunities — not dump random practice names into a spreadsheet.",
  },
  {
    title: "Built for Faster Prospecting",
    body: "Spend less time researching and more time reaching out to practices that actually look ready to grow.",
  },
] as const;

const WHO_THIS_IS_FOR = [
  {
    title: "Freelancers offering dental marketing",
    body: "You're doing outreach solo. Dentily cuts your research time so you can spend the day on calls and emails, not building lists from scratch.",
  },
  {
    title: "Agencies looking for new clients",
    body: "Your team needs a repeatable pipeline into dental. Dentily gives you scored, pitch-ready practices so your reps show up with context, not cold guesses.",
  },
  {
    title: "Lead generation businesses targeting dentists",
    body: "You sell qualified dental leads to clients. Dentily helps you build territory packs faster and deliver leads with signals already baked in.",
  },
] as const;

export function DentistLanding() {
  return (
    <div className="dentily-home min-h-screen">
      <SiteHeader homeStyle />

      <LandingHeroRedesign
        primaryHref="/search#sample-preview"
        secondaryHref="/search"
        primaryLabel="See a Real Lead Pack"
        secondaryLabel="Preview My Market Free"
      />

      <LiveSampleLeads />

      <LandingSection id="relevant-pitch" variant="white">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            What happens when the pitch is relevant
          </h2>
          <figure className="mt-10 rounded-r-xl border-y border-r border-slate-200 border-l-4 border-l-blue-600 bg-slate-50/80 py-8 pl-6 pr-6 md:pl-8 md:pr-10">
            <blockquote className="text-base leading-relaxed text-slate-800 md:text-lg">
              <p>
                &ldquo;I used the outreach draft almost word for word. The practice owner said it was the first cold
                email she&apos;d actually read in months. Booked a call the same day.&rdquo;
              </p>
            </blockquote>
            <figcaption className="mt-5 text-sm font-medium text-slate-700">
              — Freelance dental marketing consultant, Austin TX
            </figcaption>
            <p className="mt-3 text-xs text-slate-500 md:text-sm">Result from a beta user. Individual outcomes vary.</p>
          </figure>
        </div>
      </LandingSection>

      <LandingHowItWorks />

      <LandingSection id="audience" variant="muted">
        <SectionHeader title="Who This Is For" className="mb-10 md:mb-12" />
        <div className="grid gap-4 md:grid-cols-3">
          {WHO_THIS_IS_FOR.map((item) => (
            <FeatureCard key={item.title} title={item.title}>
              {item.body}
            </FeatureCard>
          ))}
        </div>
      </LandingSection>

      <LandingSection id="proof" variant="white">
        <SectionHeader
          title="Built for Real Outreach Results"
          subtitle="Dentily helps you focus on the right practices with data-backed insights built for direct outreach."
          className="mb-12 md:mb-14"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {PROOF_CARDS.map((t) => (
            <FeatureCard key={t.title} title={t.title}>
              {t.body}
            </FeatureCard>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 border-t border-slate-200 pt-8 md:flex-row md:flex-wrap md:gap-x-8 md:gap-y-2">
          <span className="text-sm font-medium text-slate-700">No contracts</span>
          <span className="hidden text-slate-300 md:inline" aria-hidden>
            ·
          </span>
          <span className="text-sm font-medium text-slate-700">Instant access</span>
          <span className="hidden text-slate-300 md:inline" aria-hidden>
            ·
          </span>
          <span className="text-center text-sm font-medium text-slate-700">
            Focused on real outreach opportunities
          </span>
        </div>
        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-slate-500">
          Dentily is a B2B prospecting tool — not a dental clinic or patient service.
        </p>
      </LandingSection>

      <LandingSection id="pricing-section" variant="muted">
        <PricingSection showFooterTip />
        <div className="mx-auto mt-12 max-w-lg px-4">
          <PricingFaq />
        </div>
      </LandingSection>

      <LandingSection variant="dark" className="border-slate-800">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Ready to See What&apos;s in Your Market?</h2>
          <p className="mt-4 text-lg text-white/85">
            Get access to high-opportunity leads and reach out with confidence.
          </p>
          <Link
            href="/search"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-10 inline-flex min-h-[52px] min-w-[240px] items-center justify-center bg-white px-8 text-slate-900 hover:bg-slate-100"
            )}
          >
            {FINAL_CTA}
          </Link>
        </div>
      </LandingSection>

      <footer className="border-t border-slate-200 bg-white py-10 text-center text-sm text-slate-600">
        <div className="landing-max flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
          <p>© {new Date().getFullYear()} Dentily</p>
          <Link href="/pricing" className="text-blue-600 hover:underline">
            Pricing
          </Link>
          <HashSafeLink href="/search#sample-preview" className="text-blue-600 hover:underline">
            See a Real Lead Pack
          </HashSafeLink>
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
