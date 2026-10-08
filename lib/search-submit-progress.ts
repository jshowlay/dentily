/** Client-side status copy while POST /api/search runs (approximate phase timing). */

export function cityLabelFromLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return "your market";
  return trimmed.split(",")[0]?.trim() || trimmed;
}

export function buildSearchSubmitProgressSteps(location: string): string[] {
  const city = cityLabelFromLocation(location);
  return [
    `Finding practices in ${city}…`,
    "Comparing ratings to local competitors…",
    "Checking websites…",
    "Ranking opportunities…",
  ];
}

/** Advance to the next step on this interval while the request is in flight. */
export const SEARCH_SUBMIT_PROGRESS_STEP_MS = 9_000;
