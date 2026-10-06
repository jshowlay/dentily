/**
 * Centrally managed Google Business Profile / DSO listing signals in the website URL
 * Google attaches before we strip query strings for export.
 */

const LOCATION_ID_KEY = /(?:^|_)(?:location[_-]?id|loc[_-]?id|locationid)(?:$|_)/i;

/** True when the Google-supplied website URL looks like a corporate listing template. */
export function googleListingUrlHasDsoTrackingSignals(url: string | null | undefined): boolean {
  const s = (url ?? "").trim();
  if (!s) return false;

  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const qLower = u.search.toLowerCase();

    if (qLower.includes("sc_cid=gbp") || qLower.includes("sc_cid=gbp%3a")) return true;
    if (qLower.includes("_vsrefdom=")) return true;
    if (qLower.includes("y_source=")) return true;
    if (/location\.website/i.test(qLower)) return true;

    for (const [key, value] of u.searchParams.entries()) {
      const k = key.toLowerCase();
      const v = value.toLowerCase();
      if (k === "sc_cid" && v.includes("gbp")) return true;
      if (k === "y_source" || k === "_vsrefdom") return true;
      if (LOCATION_ID_KEY.test(k)) return true;
      if (/location\.(website|id)/i.test(v)) return true;
    }
  } catch {
    const lower = s.toLowerCase();
    if (lower.includes("sc_cid=gbp") || lower.includes("_vsrefdom=") || lower.includes("y_source=")) {
      return true;
    }
  }
  return false;
}

/** Pacific Dental Services / Smile Generation footer signal. */
export function htmlMentionsSmileGeneration(html: string | null | undefined): boolean {
  if (!html?.trim()) return false;
  return /smile\s+generation/i.test(html);
}
