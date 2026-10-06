import { parseUrlHostname, registrableHost, registrableHostFromUrl } from "@/lib/url-normalize";

/** Path must look like a contact / booking destination, not marketing content. */
const CONTACT_PATH_SEGMENT =
  /(^|\/)(contact|contact-us|contactus|appointment|appointments|schedule|request|book(?:-appointment)?|book-now|new-patient|new-patients)(\/|$)/i;

const DENY_PATH_PREFIXES = [
  "/pricing",
  "/price",
  "/services",
  "/service",
  "/blog",
  "/news",
  "/careers",
  "/jobs",
  "/team",
  "/about",
  "/privacy",
  "/terms",
  "/shop",
  "/cart",
];

export function isContactLikePath(pathname: string): boolean {
  const p = (pathname || "/").toLowerCase();
  if (DENY_PATH_PREFIXES.some((deny) => p === deny || p.startsWith(`${deny}/`))) return false;
  return CONTACT_PATH_SEGMENT.test(p);
}

export function isSamePracticeSite(formUrl: string, websiteUrl: string | null | undefined): boolean {
  const formRoot = registrableHostFromUrl(formUrl);
  const siteRoot = registrableHostFromUrl(websiteUrl);
  if (!formRoot || !siteRoot) return false;
  return formRoot === siteRoot;
}

/**
 * Contact form URL is valid when it is on the practice website domain and the path looks contact-related.
 * Homepage (/) is never accepted as a contact form URL.
 */
export function isValidContactFormUrl(
  formUrl: string | null | undefined,
  websiteUrl: string | null | undefined
): boolean {
  const raw = (formUrl ?? "").trim();
  if (!raw) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const path = u.pathname || "/";
    if (path === "/" || path === "") return false;
    if (!isSamePracticeSite(u.toString(), websiteUrl)) return false;
    return isContactLikePath(path);
  } catch {
    return false;
  }
}

export function sanitizeContactFormUrlForExport(
  website: string | null | undefined,
  contactFormUrl: string | null | undefined
): string | null {
  const raw = (contactFormUrl ?? "").trim();
  if (!raw) return null;
  if (!isValidContactFormUrl(raw, website)) return null;
  const host = parseUrlHostname(website);
  const formHost = parseUrlHostname(raw);
  if (host && formHost && registrableHost(host) !== registrableHost(formHost)) return null;
  return raw;
}
