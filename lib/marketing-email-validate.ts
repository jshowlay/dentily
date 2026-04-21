/**
 * Stricter validation for scraped "emails" before they ship in Primary Email / CSV.
 * Complements isValidEmailShape (length/charset) with boundary, TLD, and artifact checks.
 */

const SCRIPT_TAG_TOKENS =
  /\b(sentry|wixpress|cloudflare|gstatic|googleapis|wpengine|rspack|webpack|vite|vercel|netlify|fastly)\b/i;

/** RFC-like: local@domain with sane labels. */
const MARKETING_EMAIL_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

function stripUsArtifact(local: string): string {
  if (local.length > 22 && /^us(?=[a-z]{8})/i.test(local)) {
    return local.slice(2);
  }
  return local;
}

/** Mimics Python `email.utils.parseaddr` for bare mailboxes and `Name <addr>` forms. */
function parseAddrPair(raw: string): { name: string; address: string } {
  const t = raw.trim();
  if (!t) return { name: "", address: "" };
  const m = t.match(/^(.*?)\s*<([^<>@\s]+@[^<>]+)>\s*$/);
  if (m) {
    const name = m[1]!.replace(/^"|"$/g, "").trim();
    return { name, address: m[2]!.trim() };
  }
  return { name: "", address: t };
}

function parseLocalDomain(email: string): { local: string; domain: string } | null {
  const s = email.trim().toLowerCase();
  const at = s.lastIndexOf("@");
  if (at < 1 || s.indexOf("@") !== at) return null;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain || domain.includes(" ") || local.includes(" ")) return null;
  return { local, domain };
}

/** Strip a leading `www.` label from the host. Revalidate after this; web hosts often misused as mailbox domains. */
function stripWwwDomainLabel(domain: string): string {
  const labels = domain.split(".").filter(Boolean);
  if (labels.length >= 2 && labels[0] === "www") {
    return labels.slice(1).join(".");
  }
  return domain;
}

/** Reject TLDs that are clearly glued junk (e.g. comsocial, cometondental). */
function badTldArtifact(tld: string): boolean {
  if (tld.length < 2 || tld.length > 63) return true;
  if (!/^[a-z]+$/i.test(tld)) return true;
  if (/^com[a-z]{3,}$/i.test(tld)) return true;
  if (/^(net|org)[a-z]+$/i.test(tld)) return true;
  return false;
}

export type MarketingEmailValidation = { ok: true; normalized: string } | { ok: false; reason: string };

/**
 * Validates a single mailbox string after normalizeEmailCandidate.
 */
export function validateMarketingEmail(raw: string): MarketingEmailValidation {
  const trimmed = raw.trim().toLowerCase();
  const { name: displayName, address: addrFromParse } = parseAddrPair(trimmed);
  if (displayName.length > 0) {
    return { ok: false, reason: "parseaddr_display_name" };
  }
  if (addrFromParse.toLowerCase() !== trimmed) {
    return { ok: false, reason: "parseaddr_mismatch" };
  }

  const parsed = parseLocalDomain(trimmed);
  if (!parsed) return { ok: false, reason: "parse_failed" };

  let { local, domain } = parsed;
  local = stripUsArtifact(local);
  domain = stripWwwDomainLabel(domain);

  if (SCRIPT_TAG_TOKENS.test(local) || SCRIPT_TAG_TOKENS.test(domain)) {
    return { ok: false, reason: "script_or_vendor_token" };
  }

  if (/^\d+[a-z]/i.test(local) || /^[a-z]{0,3}\d{5,}[a-z]/i.test(local)) {
    return { ok: false, reason: "digit_letter_boundary_artifact" };
  }

  if (/^\d[\d.]*[a-z]/i.test(local)) {
    return { ok: false, reason: "phone_prefix_glued_to_local" };
  }

  if (/^\d+\.\d+\.\d+$/.test(domain) || /^[\d.]+$/.test(domain)) {
    return { ok: false, reason: "numeric_domain" };
  }

  const labels = domain.split(".").filter(Boolean);
  if (labels.length < 2) return { ok: false, reason: "domain_too_short" };
  const tld = labels[labels.length - 1]!;
  if (badTldArtifact(tld)) return { ok: false, reason: "tld_artifact" };
  if (tld.length === 1) return { ok: false, reason: "tld_too_short" };
  if (/^\d+$/.test(tld)) return { ok: false, reason: "numeric_tld" };

  const rebuilt = `${local}@${domain}`;
  if (!MARKETING_EMAIL_RE.test(rebuilt)) {
    return { ok: false, reason: "rfc_shape_failed" };
  }

  if (rebuilt.length > 254) return { ok: false, reason: "too_long" };

  return { ok: true, normalized: rebuilt };
}
