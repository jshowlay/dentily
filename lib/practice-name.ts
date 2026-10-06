/** Trim trailing whitespace and sentence-style punctuation from Google display names. */
export function normalizePracticeDisplayName(name: string | null | undefined): string {
  let s = (name ?? "").trim();
  if (!s) return "";
  // Strip trailing punctuation clusters (e.g. "Dentist in Austin." → "Dentist in Austin")
  for (let i = 0; i < 3; i += 1) {
    const next = s.replace(/[\s.,;:!?]+$/g, "").trim();
    if (next === s) break;
    s = next;
  }
  return s;
}
