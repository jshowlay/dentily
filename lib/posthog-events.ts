import { initPostHogClient } from "@/lib/posthog-client";

export const POSTHOG_EVENTS = {
  previewSearchRun: "preview_search_run",
  previewEmailSubmitted: "preview_email_submitted",
  checkoutClicked: "checkout_clicked",
} as const;

/** Parse "City, ST" or "City, State" from a market / location string. */
export function parseMarketCityState(location: string): { city: string; state: string } {
  const parts = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const city = parts[0] ?? location.trim();
  let state = parts[1] ?? "";
  if (state) {
    const abbr = state.match(/^([A-Za-z]{2})\b/);
    if (abbr) state = abbr[1]!.toUpperCase();
    else if (state.length === 2) state = state.toUpperCase();
  }
  return { city, state };
}

export function capturePostHogEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>
): void {
  const client = initPostHogClient();
  if (!client) return;
  const props: Record<string, string | number | boolean> = {};
  if (properties) {
    for (const [key, value] of Object.entries(properties)) {
      if (value === null || value === undefined) continue;
      props[key] = value;
    }
  }
  client.capture(event, props);
}
