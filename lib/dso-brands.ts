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
] as const;

/** Website path fragments that suggest a location page on a corporate site. */
export const DSO_MULTI_LOCATION_PATH_RE =
  /\/(?:find-a-location|locations?|location\/|our-locations|office-locations)(?:\/|$)/i;
