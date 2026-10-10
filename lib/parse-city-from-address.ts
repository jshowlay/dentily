const US_STATE_ABBREVS = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
  "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC",
]);

function looksLikeSuiteOrUnitSegment(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/^#?\d+[a-z]?$/i.test(t)) return true;
  if (/^(suite|ste|unit|bldg|building|#)\b/i.test(t)) return true;
  if (/^ste\.?\s*\d+/i.test(t)) return true;
  return false;
}

/**
 * US-style addresses: city is usually the segment after the street; when a suite line sits
 * between street and city (`..., #418, Austin, TX`), skip that segment.
 */
export function parseCityFromAddress(address: string | null | undefined): string | null {
  const raw = (address ?? "").trim();
  if (!raw) return null;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    let cityIdx = 1;
    if (parts.length >= 4 && looksLikeSuiteOrUnitSegment(parts[1]!)) {
      cityIdx = 2;
    }
    const city = parts[cityIdx]!;
    if (!city) return null;
    if (/^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/i.test(city)) return null;
    return city.replace(/\s+/g, " ").trim() || null;
  }
  if (parts.length === 2) {
    const second = parts[1]!;
    if (/^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/i.test(second) || /^\d/.test(second)) {
      return parts[0] ?? null;
    }
    return second;
  }
  return null;
}

/** Two-letter US state from a Google-style address (e.g. "…, Miami, FL 33101"). */
export function parseUsStateFromAddress(address: string | null | undefined): string | null {
  const raw = (address ?? "").trim();
  if (!raw) return null;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = parts[i]!;
    const m = seg.match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);
    if (m && US_STATE_ABBREVS.has(m[1]!.toUpperCase())) {
      return m[1]!.toUpperCase();
    }
    const lead = seg.match(/\b([A-Za-z]{2})\b/);
    if (lead && US_STATE_ABBREVS.has(lead[1]!.toUpperCase()) && seg.length <= 12) {
      return lead[1]!.toUpperCase();
    }
  }
  return null;
}

/** Plurality state code from lead addresses in one search market. */
export function inferUsStateFromAddresses(addresses: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>();
  for (const a of addresses) {
    const st = parseUsStateFromAddress(a);
    if (!st) continue;
    counts.set(st, (counts.get(st) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [st, n] of Array.from(counts.entries())) {
    if (n > bestN) {
      bestN = n;
      best = st;
    }
  }
  return best;
}
