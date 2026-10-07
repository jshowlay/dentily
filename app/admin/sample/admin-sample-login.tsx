"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export function AdminSampleLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sample/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Sign-in failed.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <Link href="/" className="text-white no-underline">
          <BrandMark variant="admin" />
        </Link>
      </header>
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="text-2xl font-semibold">Sample leads (admin)</h1>
          <p className="mt-2 text-sm text-white/70">Enter the admin password to generate outreach samples.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white"
          />
          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className={cn(buttonVariants({ size: "lg" }), "w-full bg-white text-slate-900 hover:bg-slate-100")}
          >
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
