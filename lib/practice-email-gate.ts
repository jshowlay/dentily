const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
]);

/** Legacy ISP mail — same export rules as free-mail (keep only when local part matches the practice). */
const LEGACY_ISP_MAIL_DOMAINS = new Set([
  "mindspring.com",
  "earthlink.net",
  "comcast.net",
  "att.net",
  "verizon.net",
  "sbcglobal.net",
  "cox.net",
  "charter.net",
]);

const NAME_STOP_TOKENS = new Set([
  "the",
  "and",
  "of",
  "for",
  "llc",
  "inc",
  "pa",
  "pllc",
  "dental",
  "dentistry",
  "dentist",
  "orthodontics",
  "orthodontist",
  "family",
  "care",
  "center",
  "centre",
  "clinic",
  "group",
  "office",
  "practice",
]);

export function isFreeMailDomain(domain: string): boolean {
  const d = domain.toLowerCase().replace(/^www\./, "").trim();
  return FREE_MAIL_DOMAINS.has(d);
}

export function isLegacyIspMailDomain(domain: string): boolean {
  const d = domain.toLowerCase().replace(/^www\./, "").trim();
  return LEGACY_ISP_MAIL_DOMAINS.has(d);
}

/** Personal mailbox hosts (free-mail + legacy ISP) that may ship when tied to the practice name. */
export function isConsumerMailboxDomain(domain: string): boolean {
  return isFreeMailDomain(domain) || isLegacyIspMailDomain(domain);
}

export function practiceNameTokens(name: string | null | undefined): string[] {
  return (name ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function alphanumericLocal(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "";
  return email.slice(0, at).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function alphanumericHost(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email
    .slice(at + 1)
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * True when the mailbox local part (or custom domain host) clearly references the practice name.
 */
export function emailMailboxMatchesPracticeIdentity(
  email: string,
  practiceName: string | null | undefined
): boolean {
  const local = alphanumericLocal(email);
  const host = alphanumericHost(email);
  if (!local && !host) return false;

  const tokens = practiceNameTokens(practiceName);
  if (tokens.length === 0) return false;

  for (const t of tokens) {
    if (local.includes(t) || host.includes(t)) return true;
  }

  const distinctive = tokens.filter((t) => !NAME_STOP_TOKENS.has(t) && t.length >= 4);
  for (const t of distinctive) {
    if (local.includes(t) || host.includes(t)) return true;
  }

  const compact = tokens.filter((t) => !NAME_STOP_TOKENS.has(t) || t.length >= 5).join("");
  if (compact.length >= 6 && (local.includes(compact) || host.includes(compact))) {
    return true;
  }

  return false;
}
