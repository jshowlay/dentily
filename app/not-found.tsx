import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/lib/button-variants";
import { SITE } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <header className="w-full bg-black py-4 text-white">
        <div className="container-page flex items-center justify-between">
          <Link href="/" className="text-white no-underline hover:opacity-95">
            <BrandMark />
          </Link>
          <Link
            href="/search"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "border-white bg-transparent text-white hover:bg-white/10"
            )}
          >
            {SITE.primaryCta}
          </Link>
        </div>
      </header>

      <main className="container-page py-16 md:py-24">
        <p className="text-sm font-medium text-slate-500">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Page not found</h1>
        <p className="mt-3 max-w-md text-slate-600">
          That URL doesn&apos;t match any page on Dentily. Check the address, or start from the home page or search
          flow.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            Back to home
          </Link>
          <Link
            href="/search"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full border-slate-300 sm:w-auto"
            )}
          >
            {SITE.primaryCta}
          </Link>
        </div>
      </main>
    </div>
  );
}
