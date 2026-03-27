"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-white">
      <header className="w-full bg-black py-4 text-white">
        <div className="container-page flex items-center justify-between">
          <p className="text-lg font-semibold">Leadly</p>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "bg-white text-black hover:bg-slate-100"
            )}
          >
            Home
          </Link>
        </div>
      </header>
      <section className="container-page py-10">
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          {process.env.NODE_ENV === "development"
            ? error.message || "An unexpected error occurred."
            : "An unexpected error occurred. If this persists, check server logs and environment variables (e.g. DATABASE_URL, STRIPE_SECRET_KEY)."}
        </p>
        {process.env.NODE_ENV === "development" && error.digest ? (
          <p className="mt-1 font-mono text-xs text-slate-500">Digest: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
