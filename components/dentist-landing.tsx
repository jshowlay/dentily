import Link from "next/link";
import { FeatureCard } from "@/components/landing/feature-card";
import { LandingHero } from "@/components/landing/hero";
import { SampleLeadCard } from "@/components/landing/sample-lead-card";
import { SectionHeader } from "@/components/landing/section-header";
import { SiteHeader } from "@/components/landing/site-header";
import { LandingSection } from "@/components/landing/section";
import { TrustCard } from "@/components/landing/trust-card";
import { PricingFaq } from "@/components/pricing-faq";
import { buttonVariants } from "@/lib/button-variants";
import { SITE } from "@/lib/site-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const FINAL_CTA = "Get Started With Dentily";

const BENEFITS = [
  {
    title: "Save 10+ Hours Per Week",
    body: "Skip manual research and spreadsheet hunting. Spend time on conversations, not digging for leads.",
  },
  {
    title: "Higher Response Rates",
    body: "Reach out with a specific angle tied to real signals — not generic cold emails.",
  },
  {
    title: "Better Clients, Faster",
    body: "Prioritize practices that look ready to invest in growth, not random cold calls.",
  },
  {
    title: "Walk In With Authority",
    body: "Each row includes score, rationale, and drafts so you sound informed, not generic.",
  },
] as const;

const AUDIENCE = [
  { title: "Dental Marketing Agencies", body: "Scale territory prospecting with a repeatable shortlist per city." },
  { title: "Freelancers", body: "Win more retainers by pitching with proof-backed angles per practice." },
  { title: "Consultants", body: "Lead with insight — not generic audits — and shorten the sales cycle." },
  { title: "Business Development Teams", body: "Arm reps with priorities, contact paths, and talk tracks for outreach." },
] as const;

const TRUST_PROOF = [
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

const WHAT_YOU_GET = [
  "Practice opportunities in your target area",
  "Visible growth gaps",
  "Contact details when available",
  "Clearer outreach angles",
] as const;

export function DentistLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <LandingHero
        primaryHref="/search"
        secondaryHref="/#sample-lead"
        primaryLabel={SITE.primaryCta}
        secondaryLabel={SITE.secondaryCta}
      />

      {/* Sample lead preview */}
      <LandingSection id="sample-lead" variant="white">
        <SectionHeader
          title="See the Opportunities Before You Reach Out"
          subtitle="Every result shows you exactly where a dental practice is losing growth — so you can pitch with relevance, not guesswork."
          className="mb-12 md:mb-14"
        />
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              What a Dentily Opportunity Looks Like
            </h3>
            <p className="text-base leading-relaxed text-slate-600 md:text-lg">
              Instead of handing you a generic list, Dentily highlights real growth gaps inside each practice so you
              know exactly how to position your service.
            </p>
            <ul className="space-y-3 text-sm text-slate-700 md:text-base">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
                <span>Practice name and location</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
                <span>Key growth gaps and missed opportunities</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
                <span>Contact information when available</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
                <span>Clear outreach angles you can use immediately</span>
              </li>
            </ul>
            <p className="text-sm font-medium text-slate-800">
              Built to help you start smarter conversations and win clients faster.
            </p>
          </div>
          <SampleLeadCard className="lg:sticky lg:top-28" />
        </div>
        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50/90 p-5 md:mt-14 md:p-6">
          <p className="text-center text-sm font-semibold text-slate-900">What You Get Instantly</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WHAT_YOU_GET.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-lg bg-white/80 px-3 py-2.5 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200/80 md:text-sm"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </LandingSection>

      {/* 2. Problem */}
      <LandingSection id="problem" variant="muted">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          The Real Problem Dental Marketers Face
        </h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-4 text-center text-base leading-relaxed text-slate-600 md:text-lg">
          <p>
            You waste hours on Google Maps, LinkedIn, and messy spreadsheets — only to message practices that don&apos;t
            respond, or worse, aren&apos;t a fit.
          </p>
          <p>
            You pitch generic services. They ignore you. Or you chase the wrong offices while your best opportunities
            sit in plain sight.
          </p>
          <p className="font-semibold text-slate-900">{`It's not a skill problem. It's a targeting problem.`}</p>
        </div>
      </LandingSection>

      {/* 3. Solution */}
      <LandingSection id="solution" variant="white">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Know Who Needs You — Before You Reach Out
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-slate-600 md:text-lg">
          Dentily analyzes public practice signals and surfaces growth gaps you can speak to — so your outreach is
          relevant, timely, and tied to real opportunity.
        </p>
        <ul className="mx-auto mt-10 max-w-2xl space-y-3 text-left text-slate-700">
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
            <span>
              <strong className="text-slate-900">Who needs help</strong> — scored and prioritized for your market.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
            <span>
              <strong className="text-slate-900">What they&apos;re missing</strong> — short rationale you can use in
              calls and emails.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
            <span>
              <strong className="text-slate-900">How to position your offer</strong> — message starters aligned to the
              signals.
            </span>
          </li>
        </ul>
      </LandingSection>

      {/* 4. How it works */}
      <LandingSection id="how-it-works" variant="muted">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">How it works</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-slate-600 md:text-base">
          Three steps from territory to conversations.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <span className="text-xs font-bold text-blue-600">STEP 1</span>
              <CardTitle className="text-xl text-slate-900">Target Any Area</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-600">
              Enter a location and discover dental practices with growth potential.
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <span className="text-xs font-bold text-blue-600">STEP 2</span>
              <CardTitle className="text-xl text-slate-900">Reveal Growth Gaps</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-600">
              See missing website, SEO, and social opportunities surfaced from listing and outreach-ready signals.
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <span className="text-xs font-bold text-blue-600">STEP 3</span>
              <CardTitle className="text-xl text-slate-900">Reach Out With Confidence</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-600">
              Use data-backed insights to pitch relevant solutions — not generic outreach.
            </CardContent>
          </Card>
        </div>
      </LandingSection>

      {/* 5. Benefits */}
      <LandingSection id="benefits" variant="white">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Why teams use Dentily</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-slate-600 md:text-base">
          Built for outbound — not browsing.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <FeatureCard key={b.title} title={b.title}>
              {b.body}
            </FeatureCard>
          ))}
        </div>
      </LandingSection>

      {/* 6. Target audience */}
      <LandingSection id="audience" variant="muted">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Who it&apos;s for</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-slate-600 md:text-base">
          If you sell growth services to dental practices, this is your shortlist.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCE.map((item) => (
            <Card key={item.title} className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">{item.body}</CardContent>
            </Card>
          ))}
        </div>
      </LandingSection>

      {/* 7. Trust / proof */}
      <LandingSection id="proof" variant="white">
        <SectionHeader
          title="Built for Real Outreach Results"
          subtitle="Dentily helps you focus on the right practices with data-backed insights designed for smarter prospecting."
          className="mb-12 md:mb-14"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {TRUST_PROOF.map((t) => (
            <TrustCard key={t.title} title={t.title}>
              {t.body}
            </TrustCard>
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
                {SITE.primaryCta}
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

      {/* 8. Final CTA */}
      <LandingSection variant="dark" className="border-slate-800">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Your Next Dental Client Is Already Out There
          </h2>
          <p className="mt-4 text-lg text-white/85">
            Stop wasting time on practices that aren&apos;t ready. Start targeting the ones that are.
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
          <Link href="/search" className="text-blue-600 hover:underline">
            {SITE.primaryCta}
          </Link>
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
