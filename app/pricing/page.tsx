import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PricingFaq } from "@/components/pricing-faq";
import { BuyLeadPackButton } from "@/components/buy-lead-pack-button";
import { buttonVariants } from "@/lib/button-variants";
import { SITE } from "@/lib/site-config";
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
            One-time purchase. Full CSV after checkout. Built for dental teams prioritizing specialty growth.
          </p>

          <Card className="mt-10 border-2 border-slate-900 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{SITE.leadPackPriceLabel}</CardTitle>
              <CardDescription>One-time payment · USD · no subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-slate-700">
                {SITE.leadPackCount} scored local dental practices with priorities, short rationale, and outreach
                drafts oriented toward high-value patient demand.
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> High / medium / low priority tiers
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> Contact fields when available on the listing
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span> Instant CSV download after payment
                </li>
              </ul>
              <p className="text-center text-xs font-medium text-slate-600">
                Limited to one lead pack per area to reduce overlap.
              </p>

              {validSearchId ? (
                <>
                  <BuyLeadPackButton searchId={validSearchId} label={SITE.unlockCta} className="w-full" />
                  <p className="text-center text-xs text-slate-500">
                    You will return here if checkout is canceled; success opens the download flow.
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Run a search first, then unlock from the results page — or open this page again with your search link.
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
