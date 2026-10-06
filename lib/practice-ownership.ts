import {
  DSO_BRAND_NAME_FRAGMENTS,
  DSO_GROUP_EMAIL_DOMAINS,
  DSO_MULTI_LOCATION_PATH_RE,
} from "@/lib/dso-brands";
import {
  googleListingUrlHasDsoTrackingSignals,
  htmlMentionsSmileGeneration,
} from "@/lib/dso-listing-url";
import { emailRegistrableDomain, parseUrlHostname, registrableHost, registrableHostFromUrl } from "@/lib/url-normalize";

export type PracticeOwnership = "Independent" | "Likely DSO" | "Unknown";

export const OFF_DOMAIN_EMAIL_NOTE =
  "Email domain does not match website — verify before sending.";

export const DSO_WHY_THIS_LEAD_SUFFIX =
  "Corporate-owned location — marketing decisions are usually made at HQ.";

function nameMatchesDsoBrand(name: string | null | undefined): boolean {
  const n = (name ?? "").toLowerCase();
  if (!n.trim()) return false;
  return DSO_BRAND_NAME_FRAGMENTS.some((frag) => n.includes(frag));
}

function websiteHasMultiLocationPath(website: string | null | undefined): boolean {
  const s = (website ?? "").trim();
  if (!s) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return DSO_MULTI_LOCATION_PATH_RE.test(u.pathname);
  } catch {
    return DSO_MULTI_LOCATION_PATH_RE.test(s);
  }
}

function hostIsKnownGroupDomain(hostOrEmail: string | null | undefined): boolean {
  if (!hostOrEmail?.trim()) return false;
  if (hostOrEmail.includes("@")) {
    const root = emailRegistrableDomain(hostOrEmail);
    return root ? DSO_GROUP_EMAIL_DOMAINS.has(root) : false;
  }
  const host = parseUrlHostname(hostOrEmail);
  if (!host) return false;
  return DSO_GROUP_EMAIL_DOMAINS.has(registrableHost(host));
}

function contactHostDiffersFromWebsiteGroup(
  website: string | null | undefined,
  contactFormUrl: string | null | undefined
): boolean {
  const siteRoot = registrableHostFromUrl(website);
  const formHost = parseUrlHostname(contactFormUrl);
  if (!siteRoot || !formHost) return false;
  const formRoot = registrableHost(formHost);
  if (siteRoot === formRoot) return false;
  return DSO_GROUP_EMAIL_DOMAINS.has(formRoot);
}

export function classifyPracticeOwnership(input: {
  name?: string | null;
  website?: string | null;
  /** Raw Google listing website (with tracking params) before export strips the query string. */
  googleListingWebsite?: string | null;
  primaryEmail?: string | null;
  contactFormUrl?: string | null;
  homepageMentionsSmileGeneration?: boolean;
  homepageHtml?: string | null;
}): PracticeOwnership {
  const listingUrl = input.googleListingWebsite ?? input.website;
  if (googleListingUrlHasDsoTrackingSignals(listingUrl)) return "Likely DSO";
  if (input.homepageMentionsSmileGeneration || htmlMentionsSmileGeneration(input.homepageHtml)) {
    return "Likely DSO";
  }
  if (nameMatchesDsoBrand(input.name)) return "Likely DSO";
  if (websiteHasMultiLocationPath(input.website)) return "Likely DSO";

  const siteRoot = registrableHostFromUrl(input.website);
  const email = (input.primaryEmail ?? "").trim().toLowerCase();
  if (email && siteRoot) {
    const mailRoot = emailRegistrableDomain(email);
    if (mailRoot && mailRoot !== siteRoot && DSO_GROUP_EMAIL_DOMAINS.has(mailRoot)) {
      return "Likely DSO";
    }
    if (hostIsKnownGroupDomain(email)) return "Likely DSO";
  }

  if (contactHostDiffersFromWebsiteGroup(input.website, input.contactFormUrl)) {
    return "Likely DSO";
  }

  if (siteRoot || email) return "Independent";
  return "Unknown";
}

export function demotePriorityOneLevel(priority: string | null | undefined): string {
  const p = (priority ?? "").toLowerCase();
  if (p === "high") return "medium";
  if (p === "medium") return "low";
  return "low";
}
