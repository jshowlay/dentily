import { buildCsv } from "@/lib/csv";
import {
  classifyOpportunityType,
  classifyPriorityFromScore,
  computeBaseScore,
  computeExportReasonLine,
} from "@/lib/dentist-scoring";
import { exportRowToLead } from "@/lib/export-lead-adapter";
import { enrichWithApollo } from "@/lib/apollo-stub";
import { buildMarcusWrittenOutreach, buildVoicemailScript } from "@/lib/marcus-outreach";
import { computePlaceholdersRemaining } from "@/lib/outreach-placeholders";
import { parseCityFromAddress } from "@/lib/parse-city-from-address";
import { validateMarketingEmail } from "@/lib/marketing-email-validate";
import { outreachReadinessFromContactSignals } from "@/lib/outreach-readiness";
import type { EmailStatus, ExportLeadRow } from "@/lib/types";

function coerceEmailStatus(raw: string | null | undefined): EmailStatus | null {
  if (!raw?.trim()) return null;
  const v = raw.trim().toLowerCase().replace(/\s+/g, "_");
  const allowed: EmailStatus[] = [
    "found",
    "contact_form_only",
    "not_found",
    "invalid",
    "skipped",
    "pending",
  ];
  return allowed.includes(v as EmailStatus) ? (v as EmailStatus) : null;
}

/** Sort: priority high → medium → low, then score descending. */
export function priorityRank(priority: string | null | undefined): number {
  const v = (priority ?? "").toLowerCase();
  if (v === "high") return 3;
  if (v === "medium") return 2;
  if (v === "low") return 1;
  return 0;
}

/** 0–3 contact paths for sort tiebreak (after priority and score). */
export function reachabilitySlotsFromRow(row: {
  primary_email?: string | null;
  primaryEmail?: string | null;
  contact_form_url?: string | null;
  contactFormUrl?: string | null;
  phone?: string | null;
}): number {
  return computeReachabilityScore({
    primary_email: row.primary_email ?? row.primaryEmail ?? null,
    contact_form_url: row.contact_form_url ?? row.contactFormUrl ?? null,
    phone: row.phone ?? null,
  });
}

export function sortByPriorityThenScore<
  T extends {
    priority?: string | null;
    score?: number | null;
    primary_email?: string | null;
    primaryEmail?: string | null;
    contact_form_url?: string | null;
    contactFormUrl?: string | null;
    phone?: string | null;
  },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const pr = priorityRank(b.priority) - priorityRank(a.priority);
    if (pr !== 0) return pr;
    const sa = a.score ?? -Infinity;
    const sb = b.score ?? -Infinity;
    if (sb !== sa) return sb - sa;
    return reachabilitySlotsFromRow(b) - reachabilitySlotsFromRow(a);
  });
}

/**
 * Only emit a "why now" when we have a concrete trigger from fields we already have.
 * Otherwise return blank (no filler). Future: review velocity deltas, hiring posts, permit filings, ad transparency.
 */
export function computeWhyNow(input: {
  website: string | null;
  rating: number | null;
  review_count: number | null;
}): string {
  const web = (input.website ?? "").trim();
  if (!web) {
    return "No public website on file. Patients often default to whoever is easiest to vet online.";
  }
  const rating = input.rating;
  const rc = input.review_count;
  if (rating !== null && rating !== undefined && Number(rating) < 4.0) {
    return "Public rating is under 4.0. That signal usually shows up before clinical quality in search.";
  }
  if (rc !== null && rc !== undefined && Number(rc) < 15) {
    return "Very few public reviews. Trust on maps is still thin versus nearby peers.";
  }
  return "";
}

/** Normalize street address for co-tenant detection (strip suite tokens, punctuation). */
export function normalizeAddressKey(address: string | null | undefined): string {
  const raw = (address ?? "").toLowerCase();
  if (!raw.trim()) return "";
  let a = raw.replace(/,?\s*(suite|ste|unit|#|apt|bldg|building)\.?\s*[a-z0-9-]+/gi, "");
  a = a.replace(/[^a-z0-9]+/g, " ");
  return a.replace(/\s+/g, " ").trim();
}

export function computeReachabilityScore(input: {
  primary_email: string | null | undefined;
  contact_form_url: string | null | undefined;
  phone: string | null | undefined;
}): number {
  let n = 0;
  if (csvCell(input.primary_email)) n += 1;
  if (csvCell(input.contact_form_url)) n += 1;
  if (csvCell(input.phone)) n += 1;
  return Math.min(3, n);
}

export function computeContactableLabel(input: {
  primary_email: string | null | undefined;
  contact_form_url: string | null | undefined;
  phone: string | null | undefined;
}): string {
  if (csvCell(input.primary_email) || csvCell(input.contact_form_url)) return "Yes";
  if (csvCell(input.phone)) return "Gatekeeper only";
  return "No";
}

function bestContactForPack(input: {
  primary_email: string | null | undefined;
  contact_form_url: string | null | undefined;
  phone: string | null | undefined;
}): { label: string; phoneOnly: boolean } {
  if (csvCell(input.primary_email)) return { label: "Email", phoneOnly: false };
  if (csvCell(input.contact_form_url)) return { label: "Contact Form", phoneOnly: false };
  if (csvCell(input.phone)) return { label: "Phone (no digital path)", phoneOnly: true };
  return { label: "None", phoneOnly: false };
}

type PipelineRow = ExportLeadRow & {
  why_now: string;
  cluster_notes: string;
  cluster_demoted: boolean;
};

function parseUrlHostname(raw: string | null | undefined): string | null {
  const s = csvCell(raw);
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Naive registrable host: last two labels (covers most .com dental sites). */
function registrableHost(host: string): string {
  const h = host.replace(/^www\./, "");
  const labels = h.split(".").filter(Boolean);
  if (labels.length < 2) return h;
  return labels.slice(-2).join(".");
}

function practiceNameTokens(name: string | null | undefined): string[] {
  return (name ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

/**
 * Drop scraped contact forms that point at unrelated domains (e.g. ecommerce sites).
 * Keeps the form when it matches the practice website root, or the form host contains a name token.
 */
export function sanitizeContactFormUrlAgainstWebsite(
  practiceName: string | null | undefined,
  website: string | null | undefined,
  contactFormUrl: string | null | undefined
): string | null {
  const formRaw = (contactFormUrl ?? "").trim();
  if (!formRaw) return null;
  const fHost = parseUrlHostname(formRaw);
  if (!fHost) return null;
  const fRoot = registrableHost(fHost);
  const wHost = parseUrlHostname(website);
  const wRoot = wHost ? registrableHost(wHost) : "";
  if (wRoot && wRoot === fRoot) return formRaw;
  const tokens = practiceNameTokens(practiceName);
  for (const t of tokens) {
    if (fHost.includes(t) || fRoot.includes(t)) return formRaw;
  }
  if (!wRoot) return null;
  return null;
}

export const ACTION_TIER_READY = "Tier 1: Ready to Contact";
export const ACTION_TIER_CALL = "Tier 2: Call First";
export const ACTION_TIER_RESEARCH = "Tier 3: Research Required";

function computeActionTier(input: {
  primary_email: string | null | undefined;
  contact_form_url: string | null | undefined;
  phone: string | null | undefined;
}): string {
  if (csvCell(input.primary_email) || csvCell(input.contact_form_url)) return ACTION_TIER_READY;
  if (csvCell(input.phone)) return ACTION_TIER_CALL;
  return ACTION_TIER_RESEARCH;
}

function opportunityTypeKey(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function capWords(s: string, maxWords: number): string {
  const w = s.trim().split(/\s+/).filter(Boolean);
  if (w.length <= maxWords) return w.join(" ");
  return `${w.slice(0, maxWords).join(" ")}.`;
}

function computeWhyThisLead(r: PipelineRow): string {
  const key = opportunityTypeKey(r.opportunity_type);
  const ratingStr =
    r.rating !== null && r.rating !== undefined && Number.isFinite(Number(r.rating))
      ? String(r.rating)
      : "unknown";
  const rcStr =
    r.review_count !== null && r.review_count !== undefined && Number.isFinite(Number(r.review_count))
      ? String(r.review_count)
      : "unknown";
  const pri = displayPriorityCsv(r.priority);

  let core = "";
  if (key === "no_website") {
    core = "No standalone website on file — foundational digital presence is the starting point.";
  } else if (key === "reputation_gap") {
    core = `Public rating of ${ratingStr} is likely filtering them out of high-intent searches — reputation work has clear ROI here.`;
  } else if (key === "established_static") {
    core = `Strong rating (${ratingStr}) with ${rcStr} reviews but no visible growth motion — ready for paid acquisition or conversion work.`;
  } else if (key === "newer_unknown") {
    core = `Early-stage practice with only ${rcStr} reviews — visibility and reputation-building is the immediate unlock.`;
  } else if (key === "high_volume_saturation") {
    core = `Already dominant (${rcStr} reviews) — not a growth pitch. Consider hiring-pipeline or referral-partnership angles instead.`;
  } else {
    core = `Solid fundamentals (${ratingStr} stars, ${rcStr} reviews) with room to convert local visibility into more bookings.`;
  }
  const tail = pri ? ` (${pri} priority.)` : "";
  return capWords(`${core}${tail}`, 25);
}

/** First CSV row: buyer instructions (not a lead). */
export const LEAD_PACK_INSTRUCTION_ROW_NAME = "--- HOW TO USE THIS PACK ---";

export const LEAD_PACK_INSTRUCTION_OUTREACH =
  'BEFORE YOU SEND: Replace {{your_name}}, {{your_company}}, and {{your_credibility_line}} in every Outreach cell. Example credibility lines: "I run a dental SEO agency and have worked with 12 practices in the last two years." / "I do paid ads for healthcare practices \u2014 my last dental client cut their cost-per-new-patient by 40%." / "I help local service businesses show up on Google Maps \u2014 dentistry is one of my specialties." Sort by Priority (High first), then Score descending. Start with Email leads before Contact Form leads.';

export function isLeadPackInstructionRow(row: { name: string }): boolean {
  return row.name === LEAD_PACK_INSTRUCTION_ROW_NAME;
}

function countSharedAddressClusterGroups(rows: PipelineRow[]): number {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = normalizeAddressKey(r.address);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  let n = 0;
  for (const c of Array.from(m.values())) {
    if (c >= 2) n += 1;
  }
  return n;
}

function logPipelineRunComplete(
  sourceRows: ExportLeadRow[],
  sanitizedRows: ExportLeadRow[],
  sortedPipeline: PipelineRow[],
  dataRowCount: number
): void {
  let emailValid = 0;
  let emailRejected = 0;
  for (let i = 0; i < sourceRows.length; i += 1) {
    const raw = csvCell(sourceRows[i]?.primary_email);
    if (!raw) continue;
    if (csvCell(sanitizedRows[i]?.primary_email)) emailValid += 1;
    else emailRejected += 1;
  }
  const forms = sortedPipeline.filter((r) => csvCell(r.contact_form_url)).length;
  const phoneOnly = sortedPipeline.filter((r) => {
    const b = bestContactForPack({
      primary_email: r.primary_email,
      contact_form_url: r.contact_form_url,
      phone: r.phone,
    });
    return b.phoneOnly;
  }).length;
  const clusters = countSharedAddressClusterGroups(sortedPipeline);
  let hi = 0;
  let med = 0;
  let lo = 0;
  for (const r of sortedPipeline) {
    const p = (r.priority ?? "").toLowerCase();
    if (p === "high") hi += 1;
    else if (p === "medium") med += 1;
    else if (p === "low") lo += 1;
  }
  console.log(`Pipeline complete: ${dataRowCount} rows processed`);
  console.log(
    `  Emails found: ${emailValid} (valid), ${emailRejected} (rejected \u2014 see Email Rejection Reason column)`
  );
  console.log(`  Contact forms found: ${forms}`);
  console.log(`  Phone only: ${phoneOnly}`);
  console.log(`  Clusters detected: ${clusters} shared-address groups`);
  console.log(`  Priority: High ${hi} / Medium ${med} / Low ${lo}`);
}

function buildInstructionPackRow() {
  return {
    name: LEAD_PACK_INSTRUCTION_ROW_NAME,
    priority: "",
    action_tier: "",
    why_this_lead: "",
    address: "",
    website: "",
    phone: "",
    primary_email: "",
    other_emails: "",
    contact_form_url: "",
    best_contact_method: "",
    reachability_score: "",
    contactable: "",
    cluster_notes: "",
    voicemail_script: "",
    email_status: "",
    email_source: "",
    enrichment_notes: "",
    email_rejection_reason: "",
    outreach_readiness: "",
    estimated_opportunity: "",
    rating: "",
    review_count: "",
    score: "",
    opportunity_type: "",
    why_now: "",
    reason: "",
    outreach_draft: LEAD_PACK_INSTRUCTION_OUTREACH,
    maps_url: "",
    top_lead: "No" as const,
    placeholders_remaining: "",
    apollo_enrichment: "",
  };
}

function applyAddressClusters(rows: PipelineRow[]): PipelineRow[] {
  const keys = rows.map((r) => normalizeAddressKey(r.address));
  const groups = new Map<string, number[]>();
  keys.forEach((k, i) => {
    if (!k) return;
    const arr = groups.get(k) ?? [];
    arr.push(i);
    groups.set(k, arr);
  });
  const demote = new Set<number>();
  const notes = new Map<number, string>();
  for (const idxs of Array.from(groups.values())) {
    if (idxs.length < 2) continue;
    for (const i of idxs) {
      const otherNames = idxs
        .filter((j) => j !== i)
        .map((j) => rows[j]?.name)
        .filter(Boolean)
        .join("; ");
      notes.set(i, `Shared address with: ${otherNames}`);
    }
    const sortedIdx = [...idxs].sort((a, b) => {
      const sa = rows[a]?.score ?? -1;
      const sb = rows[b]?.score ?? -1;
      if (sb !== sa) return sb - sa;
      return (rows[a]?.name ?? "").localeCompare(rows[b]?.name ?? "");
    });
    for (const loser of sortedIdx.slice(1)) {
      demote.add(loser);
    }
  }

  return rows.map((r, i) => {
    const cn = notes.get(i) ?? "";
    if (!demote.has(i)) {
      return { ...r, cluster_notes: cn, cluster_demoted: false };
    }
    const capped = Math.min(Number(r.score ?? 40), 40);
    return {
      ...r,
      score: capped,
      priority: "low",
      cluster_notes: cn,
      cluster_demoted: true,
    };
  });
}

/** Blank for CSV / Sheets — never the string "null" or "undefined". */
export function csvCell(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  return s;
}

/** Make URLs clickable in Excel/Sheets (https prefix when missing). */
export function normalizeUrlForCsv(url: string | null | undefined): string {
  const t = csvCell(url);
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** Title case for status columns, e.g. not_found → Not Found */
export function formatStatusLabel(raw: string | null | undefined): string {
  const s = csvCell(raw);
  if (!s) return "";
  return s
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

const EMAIL_IN_TEXT = /\b[a-z0-9][a-z0-9._%+-]*@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}\b/gi;

/**
 * Pull alternate mailbox list from enrichment notes; return deduped comma-separated + notes without that tail.
 */
export function extractAlternateEmailsFromNotes(notes: string | null | undefined): {
  otherEmails: string;
  cleanedNotes: string;
} {
  const full = (notes ?? "").trim();
  if (!full) return { otherEmails: "", cleanedNotes: "" };

  const idx = full.search(/\bAlternate candidates:\s*/i);
  if (idx === -1) {
    return { otherEmails: "", cleanedNotes: full };
  }

  const before = full.slice(0, idx).trim().replace(/[;,.\s]+$/g, "");
  const segment = full.slice(idx).replace(/\bAlternate candidates:\s*/i, "").trim();
  const found = segment.match(EMAIL_IN_TEXT) ?? [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const e of found) {
    const n = e.toLowerCase().trim();
    const v = validateMarketingEmail(n);
    if (!v.ok) continue;
    const clean = v.normalized;
    if (!seen.has(clean)) {
      seen.add(clean);
      list.push(clean);
    }
  }

  return {
    otherEmails: list.join(", "),
    cleanedNotes: before,
  };
}

export function computeEstimatedOpportunity(input: {
  website: string | null | undefined;
  rating: number | null | undefined;
  review_count: number | null | undefined;
}): string {
  const web = csvCell(input.website);
  const r = input.rating;
  const rc = input.review_count;
  const ratingNum = r !== null && r !== undefined && Number.isFinite(Number(r)) ? Number(r) : null;
  const rcNum = rc !== null && rc !== undefined && Number.isFinite(Number(rc)) ? Number(rc) : null;

  if (ratingNum !== null && ratingNum < 4.0) {
    return "High upside from reputation improvement ($5k-$15k/mo)";
  }
  if (!web || (rcNum !== null && rcNum < 20)) {
    return "Website + SEO opportunity ($3k-$10k/mo)";
  }
  if (ratingNum !== null && ratingNum >= 4.5 && rcNum !== null && rcNum >= 120) {
    return "Paid ads + local SEO growth ($5k-$20k/mo)";
  }
  return "General patient growth opportunity ($3k-$12k/mo)";
}

export type TopLeadEligibilityInput = {
  primary_email: string | null | undefined;
  contact_form_url: string | null | undefined;
  phone: string | null | undefined;
  email_status: string | null | undefined;
};

/** Top Lead = contactable via email, form, or phone (Maps-backed paths count). */
export function isEligibleForTopLead(row: TopLeadEligibilityInput): boolean {
  const hasEmail = Boolean(csvCell(row.primary_email));
  const hasForm = Boolean(csvCell(row.contact_form_url));
  const hasPhone = Boolean(csvCell(row.phone));
  return hasEmail || hasForm || hasPhone;
}

/** Indices of the first `maxTop` eligible rows in sort order (for promoting next-best reachable leads). */
export function selectTopLeadIndices(rows: TopLeadEligibilityInput[], maxTop = 10): Set<number> {
  const chosen = new Set<number>();
  let n = 0;
  for (let i = 0; i < rows.length; i += 1) {
    if (n >= maxTop) break;
    if (isEligibleForTopLead(rows[i])) {
      chosen.add(i);
      n += 1;
    }
  }
  return chosen;
}

/** @deprecated Rows carry why_now internally in the export pipeline. */
export type ExportRowWithWhy = ExportLeadRow & { why_now: string };

function displayPriorityCsv(p: string | null | undefined): string {
  const s = csvCell(p);
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatOutreachReadinessLabel(raw: string | null | undefined): string {
  const s = csvCell(raw).toLowerCase();
  if (s === "high") return "High";
  if (s === "medium") return "Medium";
  if (s === "low") return "Low";
  return formatStatusLabel(raw);
}

function csvNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  const v = Number(n);
  return Number.isFinite(v) ? String(v) : "";
}

/**
 * Re-scores, rewrites outreach drafts (buyer placeholders), clusters shared addresses, and shapes CSV columns.
 * Source: raw DB export rows (original file preserved when using the Python repair script offline).
 */
/** Re-validate scraped mailbox before scoring and CSV (truth-in-advertising + routing). */
export function sanitizeExportRowForEmailGate(row: ExportLeadRow): ExportLeadRow {
  const raw = csvCell(row.primary_email);
  let primary_email: string | null = raw ? row.primary_email!.trim() : null;
  let email_rejection_reason = row.email_rejection_reason;

  if (raw) {
    const v = validateMarketingEmail(raw);
    if (v.ok) {
      primary_email = v.normalized;
    } else {
      primary_email = null;
      email_rejection_reason = [row.email_rejection_reason, `csv_export_gate:${v.reason}`]
        .filter(Boolean)
        .join("; ");
    }
  }

  const signals = {
    primaryEmail: primary_email,
    contactFormUrl: row.contact_form_url,
    phone: row.phone,
    emailStatus: coerceEmailStatus(row.email_status),
  };

  return {
    ...row,
    primary_email,
    email_rejection_reason,
    contactable: Boolean(csvCell(primary_email) || csvCell(row.contact_form_url) || csvCell(row.phone)),
    outreach_readiness: outreachReadinessFromContactSignals(signals),
  };
}

function applyContactFormDomainGate(row: ExportLeadRow): ExportLeadRow {
  const contact_form_url =
    sanitizeContactFormUrlAgainstWebsite(row.name, row.website, row.contact_form_url) ?? null;
  const signals = {
    primaryEmail: row.primary_email,
    contactFormUrl: contact_form_url,
    phone: row.phone,
    emailStatus: coerceEmailStatus(row.email_status),
  };
  return {
    ...row,
    contact_form_url,
    contactable: Boolean(
      csvCell(row.primary_email) || csvCell(contact_form_url) || csvCell(row.phone)
    ),
    outreach_readiness: outreachReadinessFromContactSignals(signals),
  };
}

export type LeadPackCsvRow = {
  name: string;
  priority: string;
  action_tier: string;
  why_this_lead: string;
  address: string;
  website: string;
  phone: string;
  primary_email: string;
  other_emails: string;
  contact_form_url: string;
  best_contact_method: string;
  reachability_score: string;
  contactable: string;
  cluster_notes: string;
  voicemail_script: string;
  email_status: string;
  email_source: string;
  enrichment_notes: string;
  email_rejection_reason: string;
  outreach_readiness: string;
  estimated_opportunity: string;
  rating: string;
  review_count: string;
  score: string;
  opportunity_type: string;
  why_now: string;
  reason: string;
  outreach_draft: string;
  maps_url: string;
  top_lead: "Yes" | "No";
  placeholders_remaining: string;
  apollo_enrichment: string;
};

export function buildLeadPackRowsFromExport(rows: ExportLeadRow[]): LeadPackCsvRow[] {
  const sourceRows = rows;
  const rowsIn = rows.map(sanitizeExportRowForEmailGate).map(applyContactFormDomainGate);
  const batchCtx = { allNamesLower: rowsIn.map((r) => (r.name ?? "").toLowerCase()) };

  let pipeline: PipelineRow[] = rowsIn.map((r, i) => {
    const lead = exportRowToLead(r, i);
    const score = computeBaseScore(lead, batchCtx);
    const priority = classifyPriorityFromScore(score);
    const why = computeWhyNow({
      website: r.website,
      rating: r.rating,
      review_count: r.review_count,
    });
    return {
      ...r,
      score,
      priority,
      opportunity_type: classifyOpportunityType(lead),
      why_now: why,
      cluster_notes: "",
      cluster_demoted: false,
    };
  });

  pipeline = applyAddressClusters(pipeline);
  const sorted = sortByPriorityThenScore(pipeline);

  const eligibility = sorted.map((r) => ({
    primary_email: r.primary_email,
    contact_form_url: r.contact_form_url,
    phone: r.phone,
    email_status: r.email_status,
  }));
  const topIdx = selectTopLeadIndices(eligibility, 10);

  const dataRows = sorted.map((r, i) => {
    const lead = exportRowToLead(r, i);
    void enrichWithApollo(r.name ?? "", csvCell(r.website), parseCityFromAddress(r.address) ?? "");
    const { otherEmails, cleanedNotes } = extractAlternateEmailsFromNotes(r.enrichment_notes);
    const website = normalizeUrlForCsv(r.website);
    const contactForm = normalizeUrlForCsv(r.contact_form_url);
    const mapsUrl = normalizeUrlForCsv(r.maps_url);
    const best = bestContactForPack({
      primary_email: r.primary_email,
      contact_form_url: r.contact_form_url,
      phone: r.phone,
    });
    const reachN = computeReachabilityScore({
      primary_email: r.primary_email,
      contact_form_url: r.contact_form_url,
      phone: r.phone,
    });
    const outreachBody = buildMarcusWrittenOutreach(lead);
    const placeholders = computePlaceholdersRemaining(outreachBody);
    const voicemail = best.phoneOnly ? buildVoicemailScript(lead) : "";
    const actionTier = computeActionTier({
      primary_email: r.primary_email,
      contact_form_url: r.contact_form_url,
      phone: r.phone,
    });
    const whyThisLead = computeWhyThisLead(r);

    return {
      name: csvCell(r.name),
      priority: displayPriorityCsv(r.priority),
      action_tier: actionTier,
      why_this_lead: whyThisLead,
      address: csvCell(r.address),
      website,
      phone: csvCell(r.phone),
      primary_email: csvCell(r.primary_email),
      other_emails: otherEmails,
      contact_form_url: contactForm,
      best_contact_method: best.label,
      reachability_score: String(reachN),
      contactable: computeContactableLabel({
        primary_email: r.primary_email,
        contact_form_url: r.contact_form_url,
        phone: r.phone,
      }),
      cluster_notes: csvCell(r.cluster_notes),
      voicemail_script: voicemail,
      email_status: formatStatusLabel(r.email_status),
      email_source: formatStatusLabel(r.email_source),
      enrichment_notes: cleanedNotes,
      email_rejection_reason: csvCell(r.email_rejection_reason),
      outreach_readiness: formatOutreachReadinessLabel(
        outreachReadinessFromContactSignals({
          primaryEmail: r.primary_email,
          contactFormUrl: r.contact_form_url,
          phone: r.phone,
          emailStatus: coerceEmailStatus(r.email_status),
        })
      ),
      estimated_opportunity: computeEstimatedOpportunity({
        website: r.website,
        rating: r.rating,
        review_count: r.review_count,
      }),
      rating: csvNumber(r.rating),
      review_count: csvNumber(r.review_count),
      score: csvNumber(r.score),
      opportunity_type: formatStatusLabel(r.opportunity_type),
      why_now: csvCell(r.why_now),
      reason: csvCell(computeExportReasonLine(lead, { clusterDemoted: r.cluster_demoted })),
      outreach_draft: csvCell(outreachBody),
      maps_url: mapsUrl,
      top_lead: topIdx.has(i) ? ("Yes" as const) : ("No" as const),
      placeholders_remaining: placeholders,
      apollo_enrichment: "",
    };
  });

  logPipelineRunComplete(sourceRows, rowsIn, sorted, dataRows.length);

  return [buildInstructionPackRow(), ...dataRows];
}

const CSV_COLUMN_ORDER: Array<{ key: keyof LeadPackCsvRow; label: string }> = [
  { key: "name", label: "Name" },
  { key: "priority", label: "Priority" },
  { key: "action_tier", label: "Action Tier" },
  { key: "why_this_lead", label: "Why This Lead" },
  { key: "address", label: "Address" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
  { key: "primary_email", label: "Primary Email" },
  { key: "other_emails", label: "Other Emails" },
  { key: "contact_form_url", label: "Contact Form URL" },
  { key: "best_contact_method", label: "Best Contact Method" },
  { key: "reachability_score", label: "Reachability Score" },
  { key: "contactable", label: "Contactable" },
  { key: "cluster_notes", label: "Cluster Notes" },
  { key: "voicemail_script", label: "Voicemail Script" },
  { key: "email_status", label: "Email Status" },
  { key: "email_source", label: "Email Source" },
  { key: "enrichment_notes", label: "Enrichment Notes" },
  { key: "email_rejection_reason", label: "Email Rejection Reason" },
  { key: "outreach_readiness", label: "Outreach Readiness" },
  { key: "estimated_opportunity", label: "Estimated Opportunity" },
  { key: "rating", label: "Rating" },
  { key: "review_count", label: "Review Count" },
  { key: "score", label: "Score" },
  { key: "opportunity_type", label: "Opportunity Type" },
  { key: "why_now", label: "Why Now" },
  { key: "reason", label: "Reason" },
  { key: "outreach_draft", label: "Outreach Draft (customize before sending)" },
  { key: "maps_url", label: "Maps URL" },
  { key: "top_lead", label: "Top Lead" },
  { key: "placeholders_remaining", label: "Placeholders Remaining" },
  { key: "apollo_enrichment", label: "Apollo Enrichment" },
];

/** Single header row + data rows (Excel / Sheets friendly). */
export function buildLeadPackCsv(rows: LeadPackCsvRow[]): string {
  const labels = CSV_COLUMN_ORDER.map((c) => c.label);
  if (rows.length === 0) {
    return labels.join(",");
  }
  const labeledRows: Record<string, unknown>[] = rows.map((row) => {
    const rec: Record<string, unknown> = {};
    for (const { key, label } of CSV_COLUMN_ORDER) {
      rec[label] = row[key];
    }
    return rec;
  });
  return buildCsv(labeledRows, labels as (keyof (typeof labeledRows)[0])[]);
}

export function logExportPrioritySummary(rows: LeadPackCsvRow[], topYesCount: number): void {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const r of rows) {
    if (isLeadPackInstructionRow(r)) continue;
    const p = r.priority.toLowerCase();
    if (p === "high") high += 1;
    else if (p === "medium") medium += 1;
    else if (p === "low") low += 1;
  }
  console.log(
    `[export] priorityHigh=${high} priorityMedium=${medium} priorityLow=${low} topLeadYes=${topYesCount} totalRows=${rows.length}`
  );
}

export function logSearchPrioritySummary(
  leads: Array<{ priority?: string | null; score?: number | null }>,
  topLeadCount: number
): void {
  let high = 0;
  let medium = 0;
  let low = 0;
  const scores: number[] = [];
  for (const l of leads) {
    const p = (l.priority ?? "").toLowerCase();
    if (p === "high") high += 1;
    else if (p === "medium") medium += 1;
    else if (p === "low") low += 1;
    if (typeof l.score === "number" && Number.isFinite(l.score)) {
      scores.push(l.score);
    }
  }
  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 0;
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  console.log(
    `[api/search] scoreMin=${min} scoreMax=${max} scoreAvg=${avg} priorityHigh=${high} priorityMedium=${medium} priorityLow=${low} topLeadsSelected=${topLeadCount} totalScored=${leads.length}`
  );
}
