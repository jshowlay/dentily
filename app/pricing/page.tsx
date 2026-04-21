import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { CsvSamplePreview } from "@/components/csv-sample-preview";
import { PricingFaq } from "@/components/pricing-faq";
import { PricingPlanOptions } from "@/components/pricing-plan-options";
import { buttonVariants } from "@/lib/button-variants";
import { SITE } from "@/lib/site-config";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PricingPage() {
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
        <div className="mx-auto max-w-lg text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pricing</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{SITE.leadPackName}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            One-time pack or monthly subscription for agencies, freelancers, and consultants who sell to dental practices
            — review on screen before you pay.
          </p>
        </div>

        <Card className="mx-auto mt-8 max-w-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">ROI in plain terms</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Close one client from your lead pack and it can pay for itself many times over. Dentily shortens
            list-building so you spend time on conversations, not research. Results depend on your offer and follow-up;
            we don&apos;t guarantee outcomes.
          </p>
        </Card>

        <div className="mx-auto mt-10 max-w-4xl">
          <PricingPlanOptions />
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <CsvSamplePreview />
        </div>

        <div className="mx-auto mt-12 max-w-lg">
          <PricingFaq />
        </div>
      </section>
    </main>
  );
}
