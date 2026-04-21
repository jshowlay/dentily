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
