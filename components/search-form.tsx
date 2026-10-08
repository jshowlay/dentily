"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchSubmitProgress } from "@/components/search/search-submit-progress";
import { useSearchSubmitProgress } from "@/hooks/useSearchSubmitProgress";
import { capturePostHogEvent, parseMarketCityState, POSTHOG_EVENTS } from "@/lib/posthog-events";
import { SITE } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export type ExampleMarketChip = { label: string; location: string };

type SearchFormProps = {
  defaultNiche?: string;
  defaultLocation?: string;
  cardTitle?: string;
  cardDescription?: string;
  submitLabel?: string;
  hideNicheField?: boolean;
  exampleMarkets?: ExampleMarketChip[];
  /** Warm two-column search page layout */
  variant?: "default" | "territory";
  formId?: string;
  onLocationChange?: (location: string) => void;
};

export function SearchForm({
  defaultNiche = "",
  defaultLocation = "",
  cardTitle = "Find opportunities",
  cardDescription = "Enter your niche and target location to generate scored practice records.",
  submitLabel = SITE.primaryCta,
  hideNicheField = false,
  exampleMarkets,
  variant = "default",
  formId,
  onLocationChange,
}: SearchFormProps) {
  const [niche, setNiche] = useState(defaultNiche);
  const [location, setLocation] = useState(defaultLocation);

  function updateLocation(value: string) {
    setLocation(value);
    onLocationChange?.(value);
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = useSearchSubmitProgress(loading, location);

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
      const { city, state } = parseMarketCityState(location);
      capturePostHogEvent(POSTHOG_EVENTS.previewSearchRun, { city, state });
      const next = `/results?searchId=${encodeURIComponent(String(data.searchId))}`;
      window.location.assign(next);
    } catch (err) {
      let message = err instanceof Error ? err.message : "Something went wrong.";
      if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
        message =
          "We could not complete the request (often a timeout while building your pack, or the dev server stopped). Wait for the terminal to finish, hard-refresh, then try again.";
      }
      setError(message);
      setLoading(false);
    }
  }

  const formBody = (
    <form
      id={formId}
      className={variant === "territory" ? "flex flex-col gap-5" : "space-y-4"}
      onSubmit={onSubmit}
    >
      {hideNicheField ? (
        <input type="hidden" name="niche" value={niche} readOnly />
      ) : (
        <Input
          placeholder="Niche (e.g. dentists)"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          required
          disabled={loading}
        />
      )}

      {variant === "territory" ? (
        <div>
          <label className="ds-field-label" htmlFor="dentily-search-location">
            Location
          </label>
          <div className="ds-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" className="text-[#888880]" />
              <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-[#888880]" />
            </svg>
            <input
              id="dentily-search-location"
              placeholder="City, region, or ZIP (e.g. Austin, TX)"
              value={location}
              onChange={(e) => updateLocation(e.target.value)}
              required
              autoComplete="address-level2"
              disabled={loading}
            />
          </div>
          {exampleMarkets?.length ? (
            <div className="mt-3">
              <span className="ds-chips-label">Try:</span>
              <div className="ds-chips">
                {exampleMarkets.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    disabled={loading}
                    className="ds-chip"
                    onClick={() => updateLocation(chip.location)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          <Input
            placeholder="City, region, or ZIP (e.g. Austin, TX)"
            value={location}
            onChange={(e) => updateLocation(e.target.value)}
            required
            autoComplete="address-level2"
            className="text-base"
            disabled={loading}
          />
          {exampleMarkets?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="w-full text-xs text-slate-500">Try:</span>
              {exampleMarkets.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={loading}
                  className={cn(
                    "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white disabled:opacity-50"
                  )}
                  onClick={() => updateLocation(chip.location)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {variant === "territory" ? (
        <button type="submit" className="ds-submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {SITE.searchSubmitLoading}
            </>
          ) : (
            submitLabel
          )}
        </button>
      ) : (
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
      )}

      {loading ? (
        <SearchSubmitProgress
          steps={progress.steps}
          activeIndex={progress.stepIndex}
          variant={variant === "territory" ? "territory" : "default"}
        />
      ) : null}
      {error ? <p className={variant === "territory" ? "ds-form-error" : "text-sm text-red-600"}>{error}</p> : null}
    </form>
  );

  if (variant === "territory") {
    return formBody;
  }

  return (
    <Card className="w-full max-w-xl border-slate-200 shadow-md">
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  );
}
