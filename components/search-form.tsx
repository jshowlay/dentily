"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SearchForm() {
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, location }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ? String(errJson.error.message) : "Failed to fetch leads."
        );
      }

      const data = await res.json();
      if (!data?.searchId) {
        throw new Error("No searchId returned from server.");
      }
      const next = `/results?searchId=${encodeURIComponent(String(data.searchId))}`;
      // Full navigation avoids flaky soft-nav cases where the URL updates but RSC never paints.
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Find high-intent local leads</CardTitle>
        <CardDescription>Enter your niche and target location to generate AI-scored prospects.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            placeholder="Niche (e.g. Dental Clinics)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            required
          />
          <Input
            placeholder="Location (e.g. Austin, TX)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Find Leads"
            )}
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
