import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { HowToUsePack } from "@/components/how-to-use-pack";
import { PricingFaq } from "@/components/pricing-faq";
import { BuyLeadPackButton } from "@/components/buy-lead-pack-button";
import { buttonVariants } from "@/lib/button-variants";
import { QUALITY_REPLACEMENT_NOTE, SITE } from "@/lib/site-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ searchId?: string }> | { searchId?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const searchIdStr = sp.searchId;
  const searchId = searchIdStr ? Number(searchIdStr) : null;
  const validSearchId = searchId && Number.isFinite(searchId) && searchId > 0 ? searchId : null;

  return (
    <main className="min-h-screen bg-white">
      <header className="w-full border-b border-white/10 bg-black py-4 text-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-white no-underline">
            <BrandMark />
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/#how-it-works" className="text-white/90 underline-offset-4 hover:underline">
              How it works
            </Link>
            <Link href="/" className="text-white/90 underline-offset-4 hover:underline">
              Home
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
          </div>
        </div>
      </header>

      <section className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-lg">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Pricing</p>
          <h1 className="mt-2 text-center text-3xl font-bold text-slate-900">{SITE.leadPackName}</h1>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-slate-600">
            One-time purchase for agencies, freelancers, and consultants who sell to dental practices — review on
            screen before you pay.
          </p>

          <Card className="mt-8 border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">ROI in plain terms</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              One closed client can make your lead pack pay for itself fast. Dentily shortens list-building so you spend
              time on conversations, not research. Results depend on your offer and follow-up; we don&apos;t guarantee
              outcomes.
            </p>
          </Card>

          <Card className="mt-8 border-2 border-slate-900 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{SITE.leadPackPriceLabel}</CardTitle>
              <CardDescription>One-time payment · USD · no subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{SITE.leadPackCount} scored practices</span> with priority
                tiers, &quot;why this lead&quot; rationale, and outreach drafts — CSV export after checkout.
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> High / medium / low priority labels
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> Explainable score factors from listing data
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> Phone, website, and Maps link when available
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> Instant CSV download after payment
                </li>
              </ul>
              <p className="rounded-md border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600">
                <span className="font-medium text-slate-800">Quality:</span> {QUALITY_REPLACEMENT_NOTE}
              </p>
              <p className="text-center text-xs font-medium text-slate-600">
                Limited to one paid pack per search area to reduce overlap.
              </p>

              <HowToUsePack className="rounded-lg border border-slate-100 bg-slate-50/80 p-4" />

              {validSearchId ? (
                <>
                  <BuyLeadPackButton searchId={validSearchId} label={SITE.unlockCta} className="w-full" />
                  <p className="text-center text-xs text-slate-500">
                    Cancel from Stripe returns here with your search ID intact.
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Run a market search first — then unlock from results, or return to this page with your search link.
                  </p>
                  <Link
                    href="/search"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "flex h-11 w-full items-center justify-center"
                    )}
                  >
                    {SITE.primaryCta}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <PricingFaq />
        </div>
      </section>
    </main>
  );
}
