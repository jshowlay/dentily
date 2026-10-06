import {
  hunterCandidateDomainsForPractice,
  type HunterDomainCandidate,
} from "@/lib/enrichment/hunter-discover";
import { extractDomain } from "@/lib/enrichment/hunter";
import { parseCityFromAddress } from "@/lib/parse-city-from-address";

export type PracticeLocationSignals = {
  streetNumber: string | null;
  streetNameKey: string | null;
  phoneDigits10: string | null;
};

export type WebsiteDiscoveryResult = {
  website: string;
  domain: string;
  phoneFromSite: string | null;
  matchedBy: "address" | "phone" | "both";
};

const PHONE_IN_HTML =
  /(?:tel:)?(?:\+1[-.\s]*)?\(?([0-9]{3})\)?[-.\s]*([0-9]{3})[-.\s]*([0-9]{4})\b/gi;

export function digitsOnlyPhone(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length >= 10) return d.slice(-10);
  return d.length >= 7 ? d : null;
}

/** Street number + core street name token for fuzzy HTML match. */
export function parseAddressStreetSignals(address: string | null | undefined): PracticeLocationSignals {
  const raw = (address ?? "").trim();
  if (!raw) {
    return { streetNumber: null, streetNameKey: null, phoneDigits10: null };
  }
  const beforeCity = raw.split(",")[0]?.trim() ?? raw;
  const numMatch = beforeCity.match(/^\s*(\d+[a-z]?)\s+/i);
  const streetNumber = numMatch?.[1] ?? null;
  let rest = beforeCity.replace(/^\s*\d+[a-z]?\s+/i, "");
  rest = rest.replace(/\s+(ste|suite|unit|#|bldg|fl|floor)\.?\s*[a-z0-9-]+/gi, "").trim();
  const words = rest
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(n|s|e|w|ne|nw|se|sw)$/.test(w));
  const streetNameKey = words.slice(0, 2).join(" ") || null;
  return { streetNumber, streetNameKey, phoneDigits10: null };
}

export function htmlContainsAddressSignals(html: string, signals: PracticeLocationSignals): boolean {
  if (!signals.streetNumber || !signals.streetNameKey) return false;
  const flat = html.replace(/\s+/g, " ").toLowerCase();
  const num = signals.streetNumber.toLowerCase();
  const street = signals.streetNameKey.toLowerCase();
  if (!flat.includes(num)) return false;
  const parts = street.split(/\s+/).filter(Boolean);
  return parts.every((p) => flat.includes(p));
}

export function extractPhonesFromHtml(html: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  PHONE_IN_HTML.lastIndex = 0;
  while ((m = PHONE_IN_HTML.exec(html)) !== null) {
    const ten = `${m[1]}${m[2]}${m[3]}`;
    found.add(ten);
  }
  return Array.from(found);
}

export function htmlContainsPhoneSignal(html: string, phoneDigits10: string | null): boolean {
  if (!phoneDigits10) return false;
  return extractPhonesFromHtml(html).includes(phoneDigits10);
}

export type FetchHtmlFn = (url: string) => Promise<{ html: string; finalUrl: string } | null>;

async function fetchCandidatePages(
  domain: string,
  fetchHtml: FetchHtmlFn
): Promise<{ homepage: string | null; contact: string | null; combined: string }> {
  const roots = [`https://${domain}/`, `https://www.${domain}/`];
  let homepage: string | null = null;
  let finalRoot = domain;
  for (const url of roots) {
    const res = await fetchHtml(url);
    if (res?.html) {
      homepage = res.html;
      try {
        finalRoot = new URL(res.finalUrl).hostname.replace(/^www\./, "");
      } catch {
        finalRoot = domain;
      }
      break;
    }
  }
  const contactPaths = ["/contact", "/contact-us", "/contactus", "/about/contact"];
  let contact: string | null = null;
  for (const path of contactPaths) {
    const res = await fetchHtml(`https://${finalRoot}${path}`);
    if (res?.html) {
      contact = res.html;
      break;
    }
  }
  const combined = [homepage, contact].filter(Boolean).join("\n");
  return { homepage, contact, combined };
}

export function validateCandidateDomainHtml(
  combinedHtml: string,
  signals: PracticeLocationSignals,
  googlePhoneDigits10: string | null
): { ok: boolean; matchedBy: WebsiteDiscoveryResult["matchedBy"] } {
  const addr = htmlContainsAddressSignals(combinedHtml, signals);
  const phone = htmlContainsPhoneSignal(combinedHtml, googlePhoneDigits10);
  if (addr && phone) return { ok: true, matchedBy: "both" };
  if (addr) return { ok: true, matchedBy: "address" };
  if (phone) return { ok: true, matchedBy: "phone" };
  return { ok: false, matchedBy: "address" };
}

function pickSitePhone(combinedHtml: string, googlePhoneDigits10: string | null): string | null {
  const phones = extractPhonesFromHtml(combinedHtml);
  if (phones.length === 0) return null;
  const alt = phones.find((p) => p !== googlePhoneDigits10);
  return alt ?? phones[0] ?? null;
}

export async function discoverCorrectedPracticeWebsite(input: {
  practiceName: string;
  address: string | null;
  phone: string | null;
  googleWebsite: string | null;
  fetchHtml: FetchHtmlFn;
  city?: string | null;
  state?: string | null;
}): Promise<WebsiteDiscoveryResult | null> {
  const googleDomain = extractDomain(input.googleWebsite);
  const city = input.city?.trim() || parseCityFromAddress(input.address) || null;
  const stateMatch = (input.address ?? "").match(/,\s*([A-Z]{2})\s+\d{5}/);
  const state = input.state?.trim() || stateMatch?.[1] || null;

  const slug = input.practiceName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "");
  const slugCandidates: HunterDomainCandidate[] = slug
    ? [
        { domain: `${slug}tx.com`, organization: input.practiceName },
        { domain: `${slug}.com`, organization: input.practiceName },
      ]
    : [];

  const hunter = await hunterCandidateDomainsForPractice(input.practiceName, city, state);
  const candidates: HunterDomainCandidate[] = [];
  const seen = new Set<string>();
  for (const c of [...hunter, ...slugCandidates]) {
    if (seen.has(c.domain)) continue;
    seen.add(c.domain);
    candidates.push(c);
  }
  if (candidates.length === 0) return null;

  const signals = parseAddressStreetSignals(input.address);
  const googlePhoneDigits10 = digitsOnlyPhone(input.phone);

  for (const cand of candidates) {
    if (googleDomain && cand.domain === googleDomain) continue;
    const pages = await fetchCandidatePages(cand.domain, input.fetchHtml);
    if (!pages.combined.trim()) continue;
    const v = validateCandidateDomainHtml(pages.combined, signals, googlePhoneDigits10);
    if (!v.ok) continue;
    const sitePhone = pickSitePhone(pages.combined, googlePhoneDigits10);
    return {
      website: `https://${cand.domain}/`,
      domain: cand.domain,
      phoneFromSite: sitePhone,
      matchedBy: v.matchedBy,
    };
  }
  return null;
}

export function formatWebsiteCorrectedNote(oldWebsite: string | null, extra?: string): string {
  const old = (oldWebsite ?? "").trim() || "unknown domain";
  const base = `Website corrected — Google listing pointed to ${old}.`;
  return extra ? `${base} ${extra}` : base;
}

export type { HunterDomainCandidate };
