"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSampleShell } from "@/components/admin/admin-sample-shell";

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
    <AdminSampleShell>
      <p className="dr-crumb">Admin · sample leads</p>
      <h1 className="dr-title dr-serif">Sign in</h1>
      <p className="dr-subtitle">Enter the admin password to generate outreach samples for any market.</p>

      <div className="dentily-search is-embedded mt-6 max-w-md">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="ds-field-label" htmlFor="admin-password">
              Password
            </label>
            <div className="ds-input-wrap">
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          {error ? (
            <div className="dr-alert is-error" role="alert">
              {error}
            </div>
          ) : null}
          <button type="submit" className="ds-submit w-full" disabled={loading}>
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </AdminSampleShell>
  );
}
