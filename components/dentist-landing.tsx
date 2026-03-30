import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PricingFaq } from "@/components/pricing-faq";
import { buttonVariants } from "@/lib/button-variants";
import { POSITIONING, SITE } from "@/lib/site-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const WHAT_YOU_GET = [
  "Scored dental practices in your chosen city",
  "Best available contact method (email, form, or phone)",
  "Estimated growth opportunity per practice",
  "Clear “why this lead” reasoning",
  "Ready-to-use outreach messaging",
  "Instant CSV download after checkout",
] as const;

const BUILT_FOR = [
  { title: "Agencies", body: "Prospecting dental clients with a clear angle per practice — without a research team." },
  { title: "Freelancers", body: "Selling marketing, SEO, or creative — spend time closing, not list-building." },
  { title: "Consultants", body: "Insight-led conversations backed by scores, rationale, and drafts." },
  { title: "Marketers", body: "Paid, organic, or local — prioritize who to contact first in each territory." },
] as const;

function LandingHeader() {
  return (
    <header className="w-full border-b border-white/10 bg-black py-4 text-white">
      <div className="container-page flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="inline-block text-white no-underline">
          <BrandMark />
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/90">
          <Link href="#about" className="underline-offset-4 hover:underline">
            About
          </Link>
          <Link href="/#what-you-get" className="underline-offset-4 hover:underline">
            What you get
          </Link>
          <Link href="/#sample-output" className="underline-offset-4 hover:underline">
            Sample output
          </Link>
          <Link href="/#how-it-works" className="underline-offset-4 hover:underline">
            How it works
          </Link>
          <Link href="/#who-its-for" className="underline-offset-4 hover:underline">
            Who it&apos;s for
          </Link>
          <Link href="/pricing" className="underline-offset-4 hover:underline">
            Pricing
          </Link>
          <Link
            href="/search"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "border-white bg-white text-black hover:bg-slate-100"
            )}
          >
            {SITE.primaryCta}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function CtaPrimary({ className }: { className?: string }) {
  return (
    <Link href="/search" className={cn(buttonVariants({ size: "lg" }), "min-h-[48px] w-full sm:w-auto", className)}>
      {SITE.primaryCta}
    </Link>
  );
}

function CtaSecondary({ className }: { className?: string }) {
  return (
    <Link
      href="/#what-you-get"
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        "min-h-[48px] w-full border-slate-300 sm:w-auto",
        className
      )}
    >
      {SITE.secondaryCta}
    </Link>
  );
}

export function DentistLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingHeader />

      {/* Hero */}
      <section className="container-page py-14 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            For agencies, freelancers, consultants &amp; marketers
          </p>
          <h1 className="mt-3 max-w-4xl mx-auto text-balance text-3xl font-bold leading-[1.12] tracking-tight text-slate-900 md:text-4xl md:leading-[1.1] lg:text-5xl">
            {POSITIONING.heroHeadline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600 md:text-xl">{POSITIONING.heroSubheadline}</p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <CtaPrimary />
            <CtaSecondary />
          </div>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-600">
            {POSITIONING.heroSupportLine}
          </p>
          <p className="mt-4 text-xs text-slate-500">{POSITIONING.heroMicrocopy}</p>
        </div>
      </section>

      {/* About Dentily */}
      <section id="about" className="scroll-mt-20 border-t border-slate-200 bg-white py-12 md:py-14">
        <div className="container-page mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">About Dentily</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            Dentily is a lead intelligence platform built for agencies, freelancers, and consultants.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            We help you identify high-opportunity dental practices and start outreach faster with clear insights and
            actionable lead data.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Dentily is not a dental clinic or patient service - it is a client acquisition tool.
          </p>
        </div>
      </section>

      {/* What you get */}
      <section id="what-you-get" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-16 md:py-20">
        <div className="container-page">
          <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">What you get</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
            A territory pack built for outbound: prioritize who to contact, why they matter, and what to say first.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_YOU_GET.map((line) => (
              <Card key={line} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="flex gap-3 pt-6">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                    ✓
                  </span>
                  <p className="text-sm font-medium leading-snug text-slate-800">{line}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div id="sample-output" className="scroll-mt-20 pt-14 md:pt-16">
            <h3 className="text-center text-lg font-semibold text-slate-900 md:text-xl">Sample row output</h3>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
              One practice record — same columns you&apos;ll see in your pack.
            </p>
            <Card className="mx-auto mt-6 max-w-4xl overflow-hidden border-slate-200 shadow-md">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-white hover:bg-white">
                        <TableHead>Practice</TableHead>
                        <TableHead className="min-w-[140px]">Opportunity</TableHead>
                        <TableHead>Best contact</TableHead>
                        <TableHead className="min-w-[160px]">Est. opportunity</TableHead>
                        <TableHead className="min-w-[220px]">Outreach angle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Riverside Family Dental</TableCell>
                        <TableCell className="text-slate-700">Reputation / reviews gap</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell className="text-slate-700">$5k–$15k/mo</TableCell>
                        <TableCell className="max-w-[280px] text-sm text-slate-600">
                          Hi — I noticed Riverside Family Dental next to stronger review profiles nearby. We help
                          practices turn local visibility into booked consults — open to a quick call this week?
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-slate-200 bg-white py-16 md:py-20">
        <div className="container-page">
          <h2 className="text-center text-2xl font-bold md:text-3xl">How it works</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-600">
            From territory pick to conversations that can pay.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Card className="border-slate-200 bg-slate-50 shadow-sm">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold text-slate-400">STEP 1</span>
                <CardTitle className="text-lg leading-snug">Choose a city</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-slate-600">
                  We surface dental practices with clear growth signals you can act on.
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50 shadow-sm">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold text-slate-400">STEP 2</span>
                <CardTitle className="text-lg leading-snug">Review your pack</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-slate-600">
                  See scores, rationale, contact paths, and outreach drafts on screen before you pay.
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50 shadow-sm">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold text-slate-400">STEP 3</span>
                <CardTitle className="text-lg leading-snug">Outreach &amp; close</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-slate-600">
                  Download the CSV after checkout and start the same day — phone, email, or form.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who-its-for" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-16 md:py-20">
        <div className="container-page">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Who it&apos;s for</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
            Dentily helps you find dental practices worth contacting — if you sell services to practices, this is your
            shortlist.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BUILT_FOR.map((item) => (
              <Card key={item.title} className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">{item.body}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing + FAQ */}
      <section id="pricing-section" className="scroll-mt-20 border-t border-slate-200 bg-white py-16 md:py-20">
        <div className="container-page mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Pricing</h2>
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
                  "flex min-h-[48px] w-full items-center justify-center"
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
      </section>

      {/* Final CTA */}
      <section className="bg-black py-16 text-white md:py-24">
        <div className="container-page mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Close your next dental client</h2>
          <p className="mt-4 text-lg text-white/85">
            Pick a territory, review your scored pack on screen, then checkout when you&apos;re ready to download.
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/70">
            Close one client from your lead pack and it can pay for itself many times over.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/search"
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-h-[52px] bg-white px-8 text-black hover:bg-slate-100"
              )}
            >
              {SITE.primaryCta}
            </Link>
            <Link
              href="/#what-you-get"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-[52px] border-white/40 bg-transparent text-white hover:bg-white/10"
              )}
            >
              {SITE.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-10 text-center text-sm text-slate-600">
        <div className="container-page flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
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
