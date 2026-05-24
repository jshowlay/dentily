"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site-config";

type Props = {
  searchId: number;
  label?: string;
  className?: string;
  /** Use a native <button> with custom classes (results page styling). */
  nativeButton?: boolean;
};

export function BuyLeadPackButton({
  searchId,
  label = SITE.unlockCta,
  className,
  nativeButton = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message ? String(data.error.message) : "Checkout failed.");
      }
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      throw new Error("No checkout URL returned.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const labelText = loading ? "Redirecting…" : label;

  return (
    <div className={nativeButton ? "dr-checkout-wrap" : "space-y-2"}>
      {nativeButton ? (
        <button type="button" className={className} disabled={loading} onClick={onClick}>
          {labelText}
        </button>
      ) : (
        <Button className={className} type="button" size="lg" disabled={loading} onClick={onClick}>
          {labelText}
        </Button>
      )}
      {error ? <p className={nativeButton ? "dr-checkout-error" : "text-sm text-red-600"}>{error}</p> : null}
    </div>
  );
}
