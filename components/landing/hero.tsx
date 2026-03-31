import Link from "next/link";
import { SampleLeadCard } from "@/components/landing/sample-lead-card";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export function LandingHero({
  primaryHref,
  secondaryHref,
  primaryLabel,
  secondaryLabel,
}: {
  primaryHref: string;
  secondaryHref: string;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <section id="product" className="border-b border-slate-200 bg-white py-12 md:py-16 lg:py-20">
      <div className="landing-max">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-[3.1rem] lg:leading-[1.1]">
              Find Dental Practices That Need Marketing Help
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 md:text-xl">
              Dentily shows you which dental practices have clear growth opportunities, why they are a good fit, and
              the best way to reach out.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href={primaryHref}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "min-h-[52px] bg-slate-900 px-8 text-white hover:bg-slate-800 sm:w-auto"
                )}
              >
                {primaryLabel}
              </Link>
              <Link
                href={secondaryHref}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "min-h-[52px] border-slate-300 px-8 text-slate-900 hover:bg-slate-100 sm:w-auto"
                )}
              >
                {secondaryLabel}
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Built for marketers, agencies, and lead gen operators targeting dental practices.
            </p>
          </div>
          <div className="w-full">
            <SampleLeadCard />
          </div>
        </div>
      </div>
    </section>
  );
}
