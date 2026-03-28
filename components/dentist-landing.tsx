import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PricingFaq } from "@/components/pricing-faq";
import { buttonVariants } from "@/lib/button-variants";
import { SITE } from "@/lib/site-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Illustrative only — Dentily delivers scored practice listings + outreach, not consumer patient records. */
const DEMO_PATIENT_LEADS = [
  {
    name: "Jordan M.",
    city: "Austin, TX",
    procedure: "Dental implants",
    intent: 88,
    status: "Warm",
    signal: "Search + content interest (demo)",
  },
  {
    name: "Priya K.",
    city: "Austin, TX",
    procedure: "Invisalign",
    intent: 82,
    status: "New",
    signal: "Local intent signal (demo)",
  },
  {
    name: "Chris L.",
    city: "Austin, TX",
    procedure: "Cosmetic / veneers",
    intent: 76,
    status: "Nurture",
    signal: "Engagement pattern (demo)",
  },
  {
    name: "Sam R.",
    city: "Austin, TX",
    procedure: "Emergency dental",
    intent: 91,
    status: "Hot",
    signal: "Urgency signal (demo)",
  },
];

const PRACTICE_PREVIEW_ROWS = [
  {
    practice: "Example Family Dental",
    score: "76",
    reason: "Moderate reviews with room to grow implant & cosmetic demand.",
    outreach: "Hi — we help practices turn local visibility into more implant and Invisalign consultations…",
  },
  {
    practice: "Sample Smiles Studio",
    score: "71",
    reason: "Strong base; outreach can emphasize high-value treatment interest.",
    outreach: "Hi — noticed strong ratings; many practices use a focused follow-up to fill specialty chairs…",
  },
];

function LandingHeader() {
  return (
    <header className="w-full border-b border-white/10 bg-black py-4 text-white">
      <div className="container-page flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="inline-block text-white no-underline">
          <BrandMark />
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/90">
          <Link href="/#how-it-works" className="underline-offset-4 hover:underline">
            How it works
          </Link>
          <Link href="/#sample-leads" className="underline-offset-4 hover:underline">
            Sample leads
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
      href="/#how-it-works"
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

      {/* 1. Hero */}
      <section className="container-page py-14 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            For dental practices &amp; dental marketers
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-[1.15] tracking-tight md:text-5xl">
            Get More High-Intent Dental Patients Without Guesswork
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600 md:text-xl">
            Dentily helps dental practices find and act on high-intent local opportunities for high-value care —
            implants, cosmetic dentistry, Invisalign, and more — with clear scores and ready-to-use outreach.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <CtaPrimary />
            <CtaSecondary />
          </div>
          <p className="mt-5 text-sm text-slate-600">
            No long-term contract. Clear pricing. Built for dental practices.
          </p>
        </div>
      </section>

      {/* 2. Trust strip */}
      <section className="border-y border-slate-200 bg-slate-50 py-8">
        <div className="container-page grid gap-6 text-center text-sm font-medium text-slate-800 sm:grid-cols-3">
          <p>Built for dental practices</p>
          <p>Focused on high-value procedures</p>
          <p>Simple workflow — no bloated agency retainers</p>
        </div>
      </section>

      {/* 3. How it works */}
      <section id="how-it-works" className="scroll-mt-20 container-page py-16 md:py-20">
        <h2 className="text-center text-2xl font-bold md:text-3xl">How it works</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Three steps from market signal to your outreach list.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "We identify local patient demand signals",
              body: "We pull structured local dental practice data and signals you can use to prioritize who to contact first.",
            },
            {
              step: "2",
              title: "We score and organize high-intent opportunities",
              body: "Each listing gets a score, priority tier, and short rationale so your team sees where effort likely pays off.",
            },
            {
              step: "3",
              title: "You receive lead data and can act fast",
              body: `Export up to ${SITE.leadPackCount} practices with outreach snippets — download after a one-time purchase.`,
            },
          ].map((item) => (
            <Card key={item.step} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold text-slate-400">STEP {item.step}</span>
                <CardTitle className="text-lg leading-snug">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. Sample leads (demo) */}
      <section id="sample-leads" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-16 md:py-20">
        <div className="container-page mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold md:text-3xl">See what a lead can look like</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Demo / illustration only.</span> Names and signals below are
            fictional and show the kind of high-intent angles teams care about. Your Dentily pack contains{" "}
            <span className="font-medium text-slate-800">real local practice records</span> (not patient PII) with
            scores and suggested outreach.
          </p>
          <Card className="mt-10 overflow-hidden border-slate-200 shadow-md">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white">
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Procedure interest</TableHead>
                    <TableHead className="text-right">Intent score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signal (demo)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEMO_PATIENT_LEADS.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.city}</TableCell>
                      <TableCell>{row.procedure}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.intent}</TableCell>
                      <TableCell>
                        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-900">
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs text-slate-600">{row.signal}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <h3 className="mt-14 text-center text-lg font-semibold text-slate-900">Your pack: practice-focused export</h3>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
            CSV includes practices, scores, priorities, and outreach — built for B2B outreach to offices, not consumer
            lists.
          </p>
          <Card className="mt-6 overflow-hidden border-slate-200">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Practice</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="min-w-[200px]">Outreach preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PRACTICE_PREVIEW_ROWS.map((row) => (
                    <TableRow key={row.practice}>
                      <TableCell className="font-medium">{row.practice}</TableCell>
                      <TableCell>{row.score}</TableCell>
                      <TableCell className="text-sm text-slate-700">{row.reason}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm text-slate-600">{row.outreach}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 5. Value props */}
      <section className="container-page py-16 md:py-20">
        <h2 className="text-center text-2xl font-bold md:text-3xl">Why teams use Dentily</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Patient acquisition, not buzzwords</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Positioning is about booked consults and specialty volume — not generic &ldquo;AI&rdquo; claims.
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Prioritized for action</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Scores and tiers help you start with listings that match your growth goals, then work the list in order.
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Outreach included</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Short message starters per practice so your team spends time on conversations, not blank-page writing.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 6. Credibility placeholders */}
      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="container-page mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Proof &amp; stories</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-600">
            Slots below are ready for real content — no fabricated clients or metrics.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { title: "Case study", label: "Coming soon", body: "Add a named practice story when you have permission." },
              { title: "Pilot results", label: "Placeholder", body: "Summarize a pilot program with real numbers later." },
              { title: "Testimonial", label: "Slot open", body: "Drop in a quote and attribution when available." },
            ].map((slot) => (
              <Card key={slot.title} className="border border-dashed border-slate-300 bg-white">
                <CardHeader>
                  <CardTitle className="text-base">{slot.title}</CardTitle>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{slot.label}</p>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">{slot.body}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Risk reversal */}
      <section className="container-page py-16 md:py-20">
        <h2 className="text-center text-2xl font-bold md:text-3xl">Straightforward terms</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">No long-term contracts</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Standard offer is a one-time purchase per search area — no forced subscription in the product flow.
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Clear lead visibility</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Review scores, reasons, and outreach on-screen before you buy; CSV unlocks after payment.
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quality workflow</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Lead quality standards are built into scoring and review. Contact us if you need a replacement or credit
              policy for your organization — not automated in-app yet.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 8. Pricing + FAQ */}
      <section id="pricing-section" className="scroll-mt-20 border-t border-slate-200 bg-slate-50 py-16 md:py-20">
        <div className="container-page mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Simple pricing</h2>
          <p className="mt-2 text-center text-sm text-slate-600">One pack. One price. Upgrade your pipeline today.</p>
          <Card className="mt-10 border-2 border-slate-900 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{SITE.leadPackName}</CardTitle>
              <p className="text-4xl font-bold">{SITE.leadPackPriceLabel}</p>
              <p className="text-sm text-slate-600">One-time · USD</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-center text-sm text-slate-700">
                {SITE.leadPackCount} scored local practices with priorities, rationale, and outreach drafts.
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> Prioritized for high-intent positioning
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> Contact fields where available
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> CSV download after checkout
                </li>
              </ul>
              <p className="text-center text-xs font-medium text-slate-700">
                Limited to one lead pack per area to reduce overlap.
              </p>
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
                Open full pricing page
              </Link>
            </CardContent>
          </Card>
          <PricingFaq />
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="bg-black py-16 text-white md:py-24">
        <div className="container-page mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Ready to fill specialty chairs?</h2>
          <p className="mt-4 text-lg text-white/80">
            Run a search, review your list, then unlock the full pack when you are ready.
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
              href="/pricing"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-[52px] border-white/40 bg-transparent text-white hover:bg-white/10"
              )}
            >
              View pricing
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
