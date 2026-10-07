import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

/** Public nav only — no sign-in or dashboard links (auth routes remain for direct URLs). */
export function AppNav() {
  return (
    <header className="w-full border-b border-white/10 bg-black py-4 text-white">
      <div className="container-page flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-white no-underline">
          <BrandMark />
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/pricing" className="text-white/90 underline-offset-4 hover:underline">
            Pricing
          </Link>
          <Link
            href="/search"
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "border-white bg-white text-black hover:bg-slate-100"
            )}
          >
            Get Leads
          </Link>
        </nav>
      </div>
    </header>
  );
}
