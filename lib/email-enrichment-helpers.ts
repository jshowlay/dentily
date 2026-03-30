import * as cheerio from "cheerio";
import type { EmailSource } from "@/lib/types";

const EMAIL_REGEX =
  /\b[a-z0-9][a-z0-9._%+\-]*@[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?)+\b/gi;

const ROLE_LOCALPARTS = new Set([
  "info",
  "office",
  "hello",
  "frontdesk",
  "appointments",
  "admin",
  "contact",
  "reception",
  "care",
  "team",
  "billing",
  "support",
]);

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "msn.com",
  "me.com",
]);

const PLACEHOLDER_EMAILS = new Set(
  [
    "example@example.com",
    "test@test.com",
    "email@example.com",
    "yourname@example.com",
    "name@email.com",
    "user@domain.com",
  ].map((e) => e.toLowerCase())
);

const PLACEHOLDER_LOCALPARTS = new Set([
  "example",
  "test",
  "fake",
  "sample",
  "demo",
  "username",
  "youremail",
  "name",
  "user",
  "email",
]);

const SOCIAL_HOST_FRAGMENTS = [
  "facebook.",
  "fb.com",
  "instagram.",
  "twitter.",
  "x.com",
  "linkedin.",
  "youtube.",
  "tiktok.",
  "pinterest.",
  "snapchat.",
];

const SKIP_PATH_PREFIXES = [
  "/wp-login",
  "/wp-admin",
  "/cart",
  "/checkout",
  "/account",
  "/login",
  "/register",
];

const CONTACT_KEYWORD_LINK =
  /\b(contact|request\s*appointment|schedule|book\s*now|get\s*in\s*touch|appointment)\b/i;

const CONTACT_PATH_SCORES: Array<{ re: RegExp; score: number }> = [
  { re: /^\/contact-us(\/|$)/i, score: 100 },
  { re: /^\/contact(\/|$)/i, score: 99 },
  { re: /^\/about-us(\/|$)/i, score: 80 },
  { re: /^\/about(\/|$)/i, score: 79 },
  { re: /^\/team(\/|$)/i, score: 70 },
  { re: /^\/locations?(\/|$)/i, score: 65 },
];

export function normalizeWebsiteUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    const u = new URL(withProtocol);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname || u.hostname.includes(" ")) return null;
    u.hash = "";
    if (u.pathname === "") u.pathname = "/";
    return u.toString();
  } catch {
    return null;
  }
}

export function stripWww(host: string): string {
  return host.replace(/^www\./i, "");
}

export function sameSiteHost(a: string, b: string): boolean {
  return stripWww(a).toLowerCase() === stripWww(b).toLowerCase();
}

export function isBlockedExternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return SOCIAL_HOST_FRAGMENTS.some((f) => h.includes(f));
}

export function decodeMailtoAddresses(href: string): string[] {
  const raw = href.trim();
  if (!/^mailto:/i.test(raw)) return [];
  try {
    const withoutScheme = raw.slice("mailto:".length);
    const addrPart = withoutScheme.split(/[?#]/)[0] ?? "";
    if (!addrPart) return [];
    const parts = addrPart.split(",").map((p) => decodeURIComponent(p.trim()).trim());
    return parts.filter(Boolean);
  } catch {
    return [];
  }
}

export function extractEmailsFromText(text: string): string[] {
  const matches = text.match(EMAIL_REGEX);
  if (!matches) return [];
  return matches.map((m) => m.trim());
}

export function normalizeEmailCandidate(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  s = s.replace(/^mailto:\s*/i, "");
  s = s.replace(/^<+|>+$/g, "");
  s = s.replace(/^\s+|\s+$/g, "");
  s = s.replace(/[),.;:'"<>]+$/g, "");
  s = s.replace(/^['"(]+/g, "");
  if (!s.includes("@")) return null;
  const at = s.lastIndexOf("@");
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain || domain.includes(" ") || local.includes(" ")) return null;
  if (domain.includes("..") || local.includes("..")) return null;
  return `${local}@${domain}`;
}

export function isValidEmailShape(email: string): boolean {
  if (email.length > 254 || email.length < 5) return false;
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@")) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;
  if (/\.(png|jpe?g|gif|webp|svg|ico|pdf|css|js)$/i.test(domain)) return false;
  if (!/^[a-z0-9._%+-]+$/.test(local)) return false;
  if (!/^[a-z0-9.-]+$/.test(domain)) return false;
  return true;
}

export function isPlaceholderEmail(email: string): boolean {
  const e = email.toLowerCase();
  if (PLACEHOLDER_EMAILS.has(e)) return true;
  const [local, domain] = e.split("@");
  if (!local || !domain) return true;
  if (PLACEHOLDER_LOCALPARTS.has(local)) return true;
  if (domain === "example.com" || domain === "test.com" || domain === "domain.com") return true;
  if (domain.startsWith("example.")) return true;
  return false;
}

export function scoreEmailForRanking(email: string): number {
  const [local, domain] = email.split("@");
  if (!local || !domain) return -1000;
  let score = 10;
  const base = local.split("+")[0] ?? local;
  if (ROLE_LOCALPARTS.has(base)) score += 40;
  if (FREE_EMAIL_DOMAINS.has(domain)) score -= 25;
  if (local.includes("noreply") || local.includes("no-reply") || local.startsWith("donotreply"))
    score -= 50;
  return score;
}

export type ScoredEmail = { email: string; source: EmailSource };

export function pickBestEmail(candidates: ScoredEmail[]): {
  best: ScoredEmail | null;
  alternates: string[];
} {
  const seen = new Set<string>();
  const valid: ScoredEmail[] = [];
  for (const c of candidates) {
    const n = normalizeEmailCandidate(c.email);
    if (!n || !isValidEmailShape(n) || isPlaceholderEmail(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    valid.push({ email: n, source: c.source });
  }
  if (valid.length === 0) return { best: null, alternates: [] };
  valid.sort((a, b) => scoreEmailForRanking(b.email) - scoreEmailForRanking(a.email));
  const best = valid[0] ?? null;
  const alternates = valid.slice(1, 5).map((v) => v.email);
  return { best, alternates };
}

function pathScore(pathname: string): number {
  let best = 0;
  for (const { re, score } of CONTACT_PATH_SCORES) {
    if (re.test(pathname)) best = Math.max(best, score);
  }
  return best;
}

function shouldSkipPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (/\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|mp4|mov|ico)$/i.test(p)) return true;
  return SKIP_PATH_PREFIXES.some((prefix) => p.startsWith(prefix));
}

export function resolveInternalUrl(href: string | undefined, pageUrl: URL): string | null {
  if (!href) return null;
  const t = href.trim();
  if (!t || t.startsWith("#") || /^javascript:/i.test(t) || /^data:/i.test(t)) return null;
  if (/^mailto:/i.test(t) || /^tel:/i.test(t)) return null;
  let u: URL;
  try {
    u = new URL(t, pageUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!sameSiteHost(u.hostname, pageUrl.hostname)) return null;
  if (isBlockedExternalHost(u.hostname)) return null;
  u.hash = "";
  if (shouldSkipPath(u.pathname)) return null;
  return u.toString();
}

export function collectLikelyContactPageUrls(html: string, pageUrl: URL, limit: number): string[] {
  const $ = cheerio.load(html);
  const candidates: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const abs = resolveInternalUrl(href, pageUrl);
    if (!abs) return;
    try {
      const u = new URL(abs);
      const ps = pathScore(u.pathname);
      const text = $(el).text().replace(/\s+/g, " ").trim();
      let score = ps;
      if (CONTACT_KEYWORD_LINK.test(text)) score = Math.max(score, 55);
      if (score < 50) return;
      if (seen.has(abs)) return;
      seen.add(abs);
      candidates.push({ url: abs, score });
    } catch {
      /* skip */
    }
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit).map((c) => c.url);
}

function inferSourceFromPath(pathname: string): EmailSource {
  if (/^\/contact/i.test(pathname)) return "contact_page";
  if (/^\/about/i.test(pathname) || /^\/team/i.test(pathname)) return "about_page";
  return "website";
}

export function extractEmailsFromHtmlDocument(
  html: string,
  pageUrl: URL
): { scored: ScoredEmail[]; footerEmails: ScoredEmail[] } {
  const $ = cheerio.load(html);
  const scored: ScoredEmail[] = [];
  const pathSource = inferSourceFromPath(pageUrl.pathname);

  $("a[href^='mailto:']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    for (const addr of decodeMailtoAddresses(href)) {
      const n = normalizeEmailCandidate(addr);
      if (n) scored.push({ email: n, source: "mailto" });
    }
  });

  const $main = $("body").clone();
  $main.find("footer").remove();
  const bodyText = $main.text() || "";
  for (const raw of extractEmailsFromText(bodyText)) {
    const n = normalizeEmailCandidate(raw);
    if (n) scored.push({ email: n, source: pathSource });
  }

  const footerEmails: ScoredEmail[] = [];
  $("footer").each((_, foot) => {
    const ft = $(foot).text();
    for (const raw of extractEmailsFromText(ft)) {
      const n = normalizeEmailCandidate(raw);
      if (n) footerEmails.push({ email: n, source: "footer" });
    }
  });

  return { scored, footerEmails };
}

/** Prefer non-footer body mailto/text order: mailto first already in scored order from extract */
export function mergePageEmails(
  html: string,
  pageUrl: URL
): { orderedCandidates: ScoredEmail[]; contactFormUrl: string | null } {
  const { scored, footerEmails } = extractEmailsFromHtmlDocument(html, pageUrl);
  const mailto = scored.filter((s) => s.source === "mailto");
  const nonFooterNonMailto = scored.filter((s) => s.source !== "mailto" && s.source !== "footer");
  const ordered: ScoredEmail[] = [...mailto, ...nonFooterNonMailto, ...footerEmails];
  const contactFormUrl = detectContactFormPageUrl(html, pageUrl);
  return { orderedCandidates: ordered, contactFormUrl };
}

export function detectContactFormPageUrl(html: string, pageUrl: URL): string | null {
  const $ = cheerio.load(html);

  for (const el of $("a[href]").toArray()) {
    const $a = $(el);
    const text = $a.text().replace(/\s+/g, " ").trim();
    if (!CONTACT_KEYWORD_LINK.test(text)) continue;
    const href = $a.attr("href");
    const abs = resolveInternalUrl(href, pageUrl);
    if (abs) {
      try {
        const u = new URL(abs);
        if (pathScore(u.pathname) >= 50 || CONTACT_KEYWORD_LINK.test(text)) {
          return abs;
        }
      } catch {
        /* skip */
      }
    }
  }

  const forms = $("form");
  if (forms.length === 0) return null;

  let bestAction: string | null = null;
  forms.each((_, form) => {
    const $f = $(form);
    const action = $f.attr("action")?.trim();
    const method = ($f.attr("method") || "get").toLowerCase();
    const hasMessage =
      $f.find(
        'textarea[name*="message" i], textarea[id*="message" i], input[name*="message" i], textarea'
      ).length > 0;
    const hasEmailField =
      $f.find('input[type="email"], input[name*="email" i], input[id*="email" i]').length > 0;
    if (method === "post" || hasMessage || hasEmailField) {
      if (action) {
        const abs = resolveInternalUrl(action, pageUrl);
        if (abs) bestAction = abs;
      }
    }
  });

  if (bestAction) return bestAction;

  const substantive = forms.toArray().some((form) => {
    const $f = $(form);
    return (
      $f.find("input, textarea, select").length >= 2 ||
      $f.find('textarea, input[type="email"]').length > 0
    );
  });
  if (substantive) return pageUrl.toString();

  return null;
}
