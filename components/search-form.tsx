"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export type ExampleMarketChip = { label: string; location: string };

type SearchFormProps = {
  defaultNiche?: string;
  defaultLocation?: string;
  cardTitle?: string;
  cardDescription?: string;
  submitLabel?: string;
  /** When true, niche is fixed to defaultNiche (hidden field) — better for dentist-only funnel */
  hideNicheField?: boolean;
  exampleMarkets?: ExampleMarketChip[];
};

export function SearchForm({
  defaultNiche = "",
  defaultLocation = "",
  cardTitle = "Find opportunities",
  cardDescription = "Enter your niche and target location to generate scored practice records.",
  submitLabel = SITE.primaryCta,
  hideNicheField = false,
  exampleMarkets,
}: SearchFormProps) {
  const [niche, setNiche] = useState(defaultNiche);
  const [location, setLocation] = useState(defaultLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${window.location.origin}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, location }),
        credentials: "same-origin",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error?.message ? String(errJson.error.message) : "Search could not be completed."
        );
      }

      const data = await res.json();
      if (!data?.searchId) {
        throw new Error("No searchId returned from server.");
      }
      const next = `/results?searchId=${encodeURIComponent(String(data.searchId))}`;
      window.location.assign(next);
    } catch (err) {
      let message = err instanceof Error ? err.message : "Something went wrong.";
      if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
        message =
          "We could not complete the request (often a timeout while building your pack, or the dev server stopped). Wait for the terminal to finish, hard-refresh, then try again. For faster local runs set DENTILY_DISABLE_EMAIL_ENRICHMENT=1.";
      }
      setError(message);
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-xl border-slate-200 shadow-md">
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          {hideNicheField ? (
            <input type="hidden" name="niche" value={niche} readOnly />
          ) : (
            <Input
              placeholder="Niche (e.g. dentists)"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              required
            />
          )}
          <div>
            <Input
              placeholder="City, region, or ZIP (e.g. Austin, TX)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              autoComplete="address-level2"
              className="text-base"
            />
            {exampleMarkets?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="w-full text-xs text-slate-500">Try:</span>
                {exampleMarkets.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    className={cn(
                      "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
                    )}
                    onClick={() => setLocation(chip.location)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {SITE.searchSubmitLoading}
              </>
            ) : (
              submitLabel
            )}
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
