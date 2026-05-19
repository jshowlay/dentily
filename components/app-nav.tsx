"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

type AppNavProps = {
  creditsRemaining?: number | null;
};

export function AppNav({ creditsRemaining }: AppNavProps) {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && session?.user;

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
          {signedIn ? (
            <>
              <Link href="/dashboard" className="text-white/90 underline-offset-4 hover:underline">
                Dashboard
              </Link>
              {typeof creditsRemaining === "number" && creditsRemaining > 0 ? (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
                  {creditsRemaining} credit{creditsRemaining === 1 ? "" : "s"} left
                </span>
              ) : (
                <Link
                  href="/pricing"
                  className="text-xs font-semibold text-amber-300 underline-offset-4 hover:underline"
                >
                  Upgrade to Pro
                </Link>
              )}
              <span className="hidden text-white/70 sm:inline">{session.user.email}</span>
            </>
          ) : (
            <>
              <Link href="/login" className="text-white/90 underline-offset-4 hover:underline">
                Sign In
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
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
