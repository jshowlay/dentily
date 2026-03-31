import Link from "next/link";
import { FeatureCard } from "@/components/landing/feature-card";
import { LandingHero } from "@/components/landing/hero";
import { LiveSampleLeads } from "@/components/landing/live-sample-leads";
import { SectionHeader } from "@/components/landing/section-header";
import { SiteHeader } from "@/components/landing/site-header";
import { LandingSection } from "@/components/landing/section";
import { PricingFaq } from "@/components/pricing-faq";
import { buttonVariants } from "@/lib/button-variants";
import { SITE } from "@/lib/site-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FINAL_CTA = "Get My First Leads";

const WHY_DENTILY_POINTS = [
  "You don’t just get a list of practices",
  "You see why each one is a good opportunity",
  "You know what to say before you reach out",
] as const;

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
  "Freelancers offering dental marketing",
  "Agencies looking for new clients",
  "Lead generation businesses targeting dentists",
] as const;

export function DentistLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <LandingHero
        primaryHref="/search#sample-preview"
        secondaryHref="/search"
        primaryLabel="View Sample Leads"
        secondaryLabel="Get My First Leads"
      />

      <section className="border-b border-slate-200 bg-slate-50/70 py-8">
        <div className="landing-max grid gap-3 md:grid-cols-3 md:gap-6">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-hidden />
            Identify high-opportunity dental leads
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-hidden />
            See why each practice is a fit
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-hidden />
            Reach out with better pitch angles
          </div>
        </div>
      </section>

      <LiveSampleLeads />

      {/* How it works */}
      <LandingSection id="how-it-works" variant="muted">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">How Dentily Works</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <span className="text-xs font-bold text-blue-600">STEP 1</span>
              <CardTitle className="text-xl text-slate-900">Search Your Market</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-600">
              Find dental practices in your target city or area.
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <span className="text-xs font-bold text-blue-600">STEP 2</span>
              <CardTitle className="text-xl text-slate-900">Spot the Best Opportunities</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-600">
              See which practices show clear signs they may need marketing help.
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <span className="text-xs font-bold text-blue-600">STEP 3</span>
              <CardTitle className="text-xl text-slate-900">Reach Out With a Better Pitch</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-600">
              Use Dentily&apos;s insights to contact practices with a more relevant offer.
            </CardContent>
          </Card>
        </div>
      </LandingSection>

      <LandingSection id="why-dentily" variant="white">
        <SectionHeader
          title="Stop wasting time on the wrong leads"
          subtitle="Most dental outreach is guesswork. You don’t know who actually needs help—you just hope someone responds."
          className="mb-10 md:mb-12"
        />
        <p className="mx-auto max-w-3xl text-center text-base leading-relaxed text-slate-600 md:text-lg">
          Dentily analyzes dental practices and surfaces real signals that indicate opportunity—so you can focus on
          leads that are more likely to convert.
        </p>
        <div className="mx-auto mt-10 max-w-2xl">
          <ul className="space-y-3 text-left text-sm text-slate-700 md:text-base">
            {WHY_DENTILY_POINTS.map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </LandingSection>

      <LandingSection id="audience" variant="muted">
        <SectionHeader title="Who This Is For" className="mb-10 md:mb-12" />
        <div className="grid gap-4 md:grid-cols-3">
          {WHO_THIS_IS_FOR.map((line) => (
            <FeatureCard key={line} title={line}>
              Built for teams that sell marketing services to dental practices.
            </FeatureCard>
          ))}
        </div>
      </LandingSection>

      {/* Trust / proof */}
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

      {/* Pricing + FAQ (kept for conversion + existing FAQ content) */}
      <LandingSection id="pricing-section" variant="muted">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Simple pricing</h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            One-time purchase. Actionable lead pack for people who sell to dental practices.
          </p>
          <p className="mx-auto mt-4 max-w-md text-center text-sm font-medium leading-relaxed text-slate-800">
            Close one client from your lead pack and it can pay for itself many times over.
          </p>
          <Card className="mt-10 border-2 border-slate-900 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{SITE.leadPackName}</CardTitle>
              <p className="text-4xl font-bold">{SITE.leadPackPriceLabel}</p>
              <p className="text-sm text-slate-600">One-time · USD · no subscription</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-center text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{SITE.leadPackCount} scored practices</span> with
                priorities, rationale per row, best contact paths, estimated opportunity, and outreach drafts for your
                market.
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> Priority tiers + numeric scores
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> Email, form, or phone when available
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> CSV download after checkout
                </li>
              </ul>
              <Link
                href="/search"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "flex min-h-[48px] w-full items-center justify-center bg-slate-900 text-white hover:bg-slate-900/90"
                )}
              >
                Get My First Leads
              </Link>
              <Link
                href="/pricing"
                className="block text-center text-sm font-medium text-blue-700 underline-offset-4 hover:underline"
              >
                Full pricing &amp; FAQ
              </Link>
            </CardContent>
          </Card>
          <PricingFaq />
        </div>
      </LandingSection>

      {/* Final CTA */}
      <LandingSection variant="dark" className="border-slate-800">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Start Finding Better Dental Clients Today</h2>
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

      <footer className="border-t border-slate-200 py-10 text-center text-sm text-slate-600">
        <div className="landing-max flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
          <p>© {new Date().getFullYear()} Dentily</p>
          <Link href="/pricing" className="text-blue-600 hover:underline">
            Pricing
          </Link>
          <Link href="/search#sample-preview" className="text-blue-600 hover:underline">
            View Sample Leads
          </Link>
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
