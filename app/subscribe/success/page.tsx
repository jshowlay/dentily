// NOTE: configure this URL in Stripe dashboard → Payment Link settings → "After payment" redirect:
// https://www.dentily.co/subscribe/success

import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Welcome — Dentily Monthly",
  description:
    "Your Dentily monthly subscription is active. Run a search to get your first scored dental practice lead pack.",
};

export default function SubscribeSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          You&apos;re in — welcome to Dentily Monthly.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Your first lead pack is ready. Head to your dashboard or run a new search to get started.
        </p>
        <Link
          href="/search"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-8 inline-flex min-h-[48px] w-full items-center justify-center bg-slate-900 text-white hover:bg-slate-900/90"
          )}
        >
          Run My First Search
        </Link>
      </div>
    </main>
  );
}
