/** Shared URL / domain helpers for enrichment and export. */

export function parseUrlHostname(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Naive registrable host: last two labels (covers most .com dental sites). */
export function registrableHost(host: string): string {
  const h = host.replace(/^www\./, "");
  const labels = h.split(".").filter(Boolean);
  if (labels.length < 2) return h;
  return labels.slice(-2).join(".");
}

export function registrableHostFromUrl(url: string | null | undefined): string {
  const host = parseUrlHostname(url);
  return host ? registrableHost(host) : "";
}

export function emailRegistrableDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return domain ? registrableHost(domain) : null;
}

export function emailMatchesWebsiteDomain(
  email: string,
  websiteUrl: string | null | undefined
): boolean {
  const siteRoot = registrableHostFromUrl(websiteUrl);
  const mailRoot = emailRegistrableDomain(email);
  if (!siteRoot || !mailRoot) return false;
  return siteRoot === mailRoot;
}

/** Remove the entire query string and hash (export / display URLs). */
export function stripAllQueryParams(url: string | null | undefined): string {
  const s = (url ?? "").trim();
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return s.split("?")[0]?.split("#")[0] ?? s;
  }
}

/** @deprecated Prefer stripAllQueryParams for export; kept for callers that only drop UTM-style keys. */
export function stripTrackingQueryParams(url: string | null | undefined): string {
  return stripAllQueryParams(url);
}

/** Google Maps listing URLs must retain `cid` for deep links to the practice. */
export function googleMapsUrlHasCid(url: string | null | undefined): boolean {
  const s = (url ?? "").trim();
  if (!s) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const cid = u.searchParams.get("cid")?.trim();
    return Boolean(cid);
  } catch {
    return /[?&]cid=[^&]+/i.test(s);
  }
}

/**
 * Export Maps URLs: keep only the `cid` query param (drop g_mp and other tracking).
 */
export function normalizeMapsUrlForCsv(url: string | null | undefined): string {
  const t = (url ?? "").trim();
  if (!t) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    const cid = u.searchParams.get("cid")?.trim();
    if (!cid) return t;
    const out = new URL(`${u.protocol}//${u.host}${u.pathname || "/"}`);
    out.searchParams.set("cid", cid);
    out.hash = "";
    return out.toString();
  } catch {
    return t;
  }
}
