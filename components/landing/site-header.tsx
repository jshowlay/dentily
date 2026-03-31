"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Product", href: "/#sample-lead" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur transition-shadow",
        scrolled ? "shadow-sm" : "shadow-none"
      )}
    >
      <div className="landing-max h-16">
        <div className="flex h-full items-center justify-between gap-3">
          <Link href="/" className="shrink-0 text-slate-900 no-underline">
            <BrandMark variant="onLight" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="whitespace-nowrap text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/#sample-lead"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "h-10 whitespace-nowrap bg-slate-900 px-4 text-xs text-white hover:bg-slate-800 sm:text-sm"
              )}
            >
              View Sample Leads
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="landing-max flex flex-col gap-1 py-3">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
