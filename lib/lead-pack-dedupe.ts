import { looksLikeIndividualProviderName, normalizeAddressKey } from "@/lib/lead-quality-filters";
import { practiceNameTokens } from "@/lib/practice-email-gate";
import { parseCityFromAddress } from "@/lib/parse-city-from-address";
import { normalizePracticeDisplayName } from "@/lib/practice-name";
import type { ExportLeadRow } from "@/lib/types";

function csvCell(v: string | null | undefined): string {
  return (v ?? "").trim();
}

function normalizePhoneKey(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

function normalizeSuiteKey(address: string | null | undefined): string {
  const raw = (address ?? "").toLowerCase();
  const m = raw.match(/(?:suite|ste|unit|#|apt|bldg|building)\.?\s*([a-z0-9-]+)/i);
  if (!m?.[1]) return "";
  return m[1].replace(/[^a-z0-9]/g, "");
}

/** Names and aliases from "Foo Dental dba Bar Dentistry" style listings. */
export function dbaMergeKeysForName(name: string | null | undefined): string[] {
  const raw = (name ?? "").trim();
  if (!raw) return [];
  const keys = new Set<string>();
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  keys.add(norm(raw));
  const dba = raw.match(/\bdba\s+(.+?)(?:\s*[,;|]|$)/i);
  if (dba?.[1]) {
    keys.add(norm(dba[1]));
    keys.add(norm(raw.replace(/\bdba\s+.+$/i, "").trim()));
  }
  const beforeDba = raw.split(/\bdba\b/i)[0]?.trim();
  if (beforeDba) keys.add(norm(beforeDba));
  return Array.from(keys).filter((k) => k.length >= 4);
}

const GENERIC_NAME_TOKENS = new Set([
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
  "smile",
  "smiles",
  "health",
  "emergency",
  "the",
  "and",
  "of",
]);

function distinctiveNameTokens(name: string | null | undefined, address: string | null | undefined): string[] {
  const city = parseCityFromAddress(address)?.trim().toLowerCase() ?? "";
  return practiceNameTokens(name).filter(
    (t) => !GENERIC_NAME_TOKENS.has(t) && t.length >= 4 && (!city || t !== city)
  );
}

function namesShareDistinctiveToken(
  a: ExportLeadRow,
  b: ExportLeadRow
): boolean {
  const ta = distinctiveNameTokens(a.name, a.address);
  const tb = new Set(distinctiveNameTokens(b.name, b.address));
  for (const t of ta) {
    if (tb.has(t)) return true;
  }
  return false;
}

function shouldMergeByDba(a: ExportLeadRow, b: ExportLeadRow): boolean {
  const aHasDba = /\bdba\b/i.test(a.name ?? "");
  const bHasDba = /\bdba\b/i.test(b.name ?? "");
  if (!aHasDba && !bHasDba) return false;
  const keysA = new Set(dbaMergeKeysForName(a.name));
  const keysB = new Set(dbaMergeKeysForName(b.name));
  for (const k of keysA) {
    if (keysB.has(k)) return true;
  }
  return false;
}

function shouldMergeByAddressSuiteAndName(a: ExportLeadRow, b: ExportLeadRow): boolean {
  const addrA = normalizeAddressKey(a.address);
  const addrB = normalizeAddressKey(b.address);
  if (!addrA || addrA !== addrB) return false;
  const suiteA = normalizeSuiteKey(a.address);
  const suiteB = normalizeSuiteKey(b.address);
  if (!suiteA || suiteA !== suiteB) return false;
  return namesShareDistinctiveToken(a, b);
}

export type LeadPackDedupeMerge = {
  reason: "shared_phone" | "dba_name" | "address_suite_name";
  kept: string;
  dropped: string;
};

function rowQualityScore(row: ExportLeadRow): number {
  let s = Number(row.score ?? 0);
  if (csvCell(row.primary_email)) s += 50;
  if (csvCell(row.contact_form_url)) s += 20;
  if (csvCell(row.phone)) s += 5;
  if (csvCell(row.website)) s += 3;
  return s;
}

function marketCitySlug(marketCity: string | null | undefined): string {
  return (marketCity ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Prefer listings anchored in the pack market (address city or name suffix). */
function marketCityPreferenceScore(row: ExportLeadRow, marketCity: string | null | undefined): number {
  const slug = marketCitySlug(marketCity);
  if (!slug) return 0;
  let s = 0;
  const addrCity = parseCityFromAddress(row.address)?.trim().toLowerCase() ?? "";
  if (addrCity && addrCity.replace(/[^a-z0-9]+/g, "") === slug) s += 25;
  const name = (row.name ?? "").toLowerCase();
  if (name.includes(slug) || name.includes((marketCity ?? "").trim().toLowerCase())) s += 20;
  return s;
}

function pickKeeper(
  a: ExportLeadRow,
  b: ExportLeadRow,
  marketCity: string | null | undefined
): ExportLeadRow {
  const aProvider = looksLikeIndividualProviderName(a.name);
  const bProvider = looksLikeIndividualProviderName(b.name);
  if (aProvider !== bProvider) return aProvider ? b : a;

  const aMarket = marketCityPreferenceScore(a, marketCity);
  const bMarket = marketCityPreferenceScore(b, marketCity);
  if (aMarket !== bMarket) return bMarket > aMarket ? b : a;

  const sa = rowQualityScore(a);
  const sb = rowQualityScore(b);
  if (sb !== sa) return sb > sa ? b : a;
  const ra = Number(a.review_count ?? 0);
  const rb = Number(b.review_count ?? 0);
  if (rb !== ra) return rb > ra ? b : a;
  return (a.name ?? "").length >= (b.name ?? "").length ? a : b;
}

function mergePair(keeper: ExportLeadRow, drop: ExportLeadRow): ExportLeadRow {
  const note = `[dedupe merged ${drop.name ?? "duplicate"}]`;
  const enrichment_notes = [keeper.enrichment_notes, drop.enrichment_notes, note].filter(Boolean).join(" ");
  return {
    ...keeper,
    enrichment_notes,
    other_emails: [keeper.other_emails, drop.primary_email, drop.other_emails]
      .filter(Boolean)
      .join(", ")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .slice(0, 8)
      .join(", "),
  };
}

function mergeReason(a: ExportLeadRow, b: ExportLeadRow): LeadPackDedupeMerge["reason"] | null {
  const phoneA = normalizePhoneKey(a.phone);
  const phoneB = normalizePhoneKey(b.phone);
  if (phoneA && phoneA === phoneB) return "shared_phone";
  if (shouldMergeByDba(a, b)) return "dba_name";
  if (shouldMergeByAddressSuiteAndName(a, b)) return "address_suite_name";
  return null;
}

/**
 * Collapse dba aliases and shared-phone rows before pack scoring.
 * Shared building address alone does not merge unless suite + name token match.
 */
export function dedupeExportLeadRows(
  rows: ExportLeadRow[],
  options?: { mergeLog?: LeadPackDedupeMerge[]; marketCity?: string | null }
): ExportLeadRow[] {
  const mergeLog = options?.mergeLog;
  const marketCity = options?.marketCity ?? null;
  let list = rows.map((r) => ({ ...r, name: normalizePracticeDisplayName(r.name) || r.name }));
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i]!;
        const b = list[j]!;
        const reason = mergeReason(a, b);
        if (!reason) continue;
        const keeper = pickKeeper(a, b, marketCity);
        const drop = keeper === a ? b : a;
        mergeLog?.push({
          reason,
          kept: keeper.name ?? "unknown",
          dropped: drop.name ?? "unknown",
        });
        const merged = mergePair(keeper, drop);
        list = list.filter((_, idx) => idx !== i && idx !== j);
        list.push(merged);
        changed = true;
        break outer;
      }
    }
  }
  return list;
}
