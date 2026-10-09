/**
 * Known DSO / group signals for ownership classification.
 * Extend DSO_GROUP_EMAIL_DOMAINS and DSO_BRAND_NAME_FRAGMENTS as you learn new groups.
 */

/** Email/contact domains that indicate corporate HQ, not the local practice site. */
export const DSO_GROUP_EMAIL_DOMAINS = new Set(
  [
    "dentalcarealliance.com",
    "dentalic.com",
    "aspendental.com",
    "heartland.com",
    "pacificdental.com",
    "westerndental.com",
    "smilebrands.com",
    "castledental.com",
    "idealdental.com",
    "brightnow.com",
    "gentledental.com",
    "affordabledentures.com",
    "smallsmiles.com",
    "willamettedental.com",
    "westcoastdental.com",
    "coastdental.com",
    "pacificdentalservices.com",
    "pdshealth.com",
  ].map((d) => d.toLowerCase())
);

/** Case-insensitive substring match on practice name. */
export const DSO_BRAND_NAME_FRAGMENTS = [
  "brident",
  "dental care alliance",
  "aspen dental",
  "heartland dental",
  "pacific dental",
  "western dental",
  "smile brands",
  "castle dental",
  "ideal dental",
  "bright now",
  "gentle dental",
  "affordable dentures",
  "mydental",
  "access dental",
  "small smiles",
  "willamette dental",
  "west coast dental",
  "coast dental",
  "pacific dental services",
  "smile generation",
] as const;

/** Website path fragments that suggest a location page on a corporate site. */
export const DSO_MULTI_LOCATION_PATH_RE =
  /\/(?:find-a-location|locations?|location\/|our-locations|office-locations)(?:\/|$)/i;

/** Corporate network sites (locations subdomain or multi-location path). */
export function websiteIndicatesCorporateLocationsNetwork(
  website: string | null | undefined
): boolean {
  const site = (website ?? "").trim();
  if (!site) return false;
  if (DSO_MULTI_LOCATION_PATH_RE.test(site)) return true;
  try {
    const host = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).hostname.toLowerCase();
    if (host.startsWith("locations.")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function isCorporateDentalBrandDomain(domain: string | null | undefined): boolean {
  const d = (domain ?? "").trim().toLowerCase().replace(/^www\./, "");
  if (!d) return false;
  if (DSO_GROUP_EMAIL_DOMAINS.has(d)) return true;
  return false;
}
