import { buildCsv } from "@/lib/csv";
import type { ExportLeadRow } from "@/lib/types";

/** Sort: priority high → medium → low, then score descending. */
export function priorityRank(priority: string | null | undefined): number {
  const v = (priority ?? "").toLowerCase();
  if (v === "high") return 3;
  if (v === "medium") return 2;
  if (v === "low") return 1;
  return 0;
}

export function sortByPriorityThenScore<
  T extends { priority?: string | null; score?: number | null },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const pr = priorityRank(b.priority) - priorityRank(a.priority);
    if (pr !== 0) return pr;
    const sa = a.score ?? -Infinity;
    const sb = b.score ?? -Infinity;
    return sb - sa;
  });
}

export function computeWhyNow(input: {
  website: string | null;
  rating: number | null;
  review_count: number | null;
}): string {
  const web = (input.website ?? "").trim();
  if (!web) {
    return "No website present — outreach can emphasize discovery and trust before the first visit";
  }
  const rating = input.rating;
  const rc = input.review_count;
  if (rating !== null && rating !== undefined && Number(rating) < 4.0) {
    return "Lower public rating — reputation angle may resonate for partnership or marketing conversations";
  }
  if (rc !== null && rc !== undefined && Number(rc) < 20) {
    return "Low review volume — strong angle for visibility and local trust-building";
  }
  if (rc !== null && rc !== undefined && Number(rc) < 75) {
    return "Moderate review volume — room to grow local demand signals";
  }
  if (
    rating !== null &&
    rating !== undefined &&
    Number(rating) >= 4.8 &&
    rc !== null &&
    rc !== undefined &&
    Number(rc) >= 250
  ) {
    return "Strong existing visibility makes this a lower-priority growth target";
  }
  return "Practice appears established — test whether growth or partnership messaging lands";
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
    if (!seen.has(n)) {
      seen.add(n);
      list.push(n);
    }
  }

  return {
    otherEmails: list.join(", "),
    cleanedNotes: before,
  };
}

export function computeBestContactMethod(input: {
  primary_email: string | null | undefined;
  contact_form_url: string | null | undefined;
  phone: string | null | undefined;
}): string {
  if (csvCell(input.primary_email)) return "Email";
  if (csvCell(input.contact_form_url)) return "Contact Form";
  if (csvCell(input.phone)) return "Phone";
  return "None";
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
    return "High upside from reputation improvement ($5k–$15k/mo)";
  }
  if (!web || (rcNum !== null && rcNum < 20)) {
    return "Website + SEO opportunity ($3k–$10k/mo)";
  }
  if (ratingNum !== null && ratingNum >= 4.5 && rcNum !== null && rcNum >= 120) {
    return "Paid ads + local SEO growth ($5k–$20k/mo)";
  }
  return "General patient growth opportunity ($3k–$12k/mo)";
}

export type TopLeadEligibilityInput = {
  primary_email: string | null | undefined;
  contact_form_url: string | null | undefined;
  phone: string | null | undefined;
  email_status: string | null | undefined;
};

/**
 * Top Lead = reachable AND not the "lost digital path" combo (no form + email not found).
 * Phone alone does not qualify when enrichment failed to find email or form URL.
 */
export function isEligibleForTopLead(row: TopLeadEligibilityInput): boolean {
  const hasEmail = Boolean(csvCell(row.primary_email));
  const hasForm = Boolean(csvCell(row.contact_form_url));
  const hasPhone = Boolean(csvCell(row.phone));
  const reachable = hasEmail || hasForm || hasPhone;
  if (!reachable) return false;

  const st = csvCell(row.email_status).toLowerCase().replace(/\s+/g, "_");
  const noForm = !hasForm;
  if (st === "not_found" && noForm) return false;

  return true;
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

/** Full CSV row shaping: URLs, statuses, new sales columns, Top Lead flags from raw DB fields. */
export function buildLeadPackRowsFromExport(sorted: ExportRowWithWhy[]): LeadPackCsvRow[] {
  const eligibility = sorted.map((r) => ({
    primary_email: r.primary_email,
    contact_form_url: r.contact_form_url,
    phone: r.phone,
    email_status: r.email_status,
  }));
  const topIdx = selectTopLeadIndices(eligibility, 10);

  return sorted.map((r, i) => {
    const { otherEmails, cleanedNotes } = extractAlternateEmailsFromNotes(r.enrichment_notes);
    const website = normalizeUrlForCsv(r.website);
    const contactForm = normalizeUrlForCsv(r.contact_form_url);
    const mapsUrl = normalizeUrlForCsv(r.maps_url);

    return {
      name: csvCell(r.name),
      address: csvCell(r.address),
      website,
      phone: csvCell(r.phone),
      primary_email: csvCell(r.primary_email),
      other_emails: otherEmails,
      contact_form_url: contactForm,
      best_contact_method: computeBestContactMethod({
        primary_email: r.primary_email,
        contact_form_url: r.contact_form_url,
        phone: r.phone,
      }),
      email_status: formatStatusLabel(r.email_status),
      email_source: formatStatusLabel(r.email_source),
      enrichment_notes: cleanedNotes,
      outreach_readiness: formatOutreachReadinessLabel(r.outreach_readiness),
      estimated_opportunity: computeEstimatedOpportunity({
        website: r.website,
        rating: r.rating,
        review_count: r.review_count,
      }),
      rating: csvNumber(r.rating),
      review_count: csvNumber(r.review_count),
      score: csvNumber(r.score),
      priority: displayPriorityCsv(r.priority),
      opportunity_type: formatStatusLabel(r.opportunity_type),
      why_now: csvCell(r.why_now),
      reason: csvCell(r.reason),
      outreach: csvCell(r.outreach),
      maps_url: mapsUrl,
      top_lead: topIdx.has(i) ? "Yes" : "No",
    };
  });
}

export type LeadPackCsvRow = {
  name: string;
  address: string;
  website: string;
  phone: string;
  primary_email: string;
  other_emails: string;
  contact_form_url: string;
  best_contact_method: string;
  email_status: string;
  email_source: string;
  enrichment_notes: string;
  outreach_readiness: string;
  estimated_opportunity: string;
  rating: string;
  review_count: string;
  score: string;
  priority: string;
  opportunity_type: string;
  why_now: string;
  reason: string;
  outreach: string;
  maps_url: string;
  top_lead: "Yes" | "No";
};

const CSV_COLUMN_ORDER: Array<{ key: keyof LeadPackCsvRow; label: string }> = [
  { key: "name", label: "Name" },
  { key: "address", label: "Address" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
  { key: "primary_email", label: "Primary Email" },
  { key: "other_emails", label: "Other Emails" },
  { key: "contact_form_url", label: "Contact Form URL" },
  { key: "best_contact_method", label: "Best Contact Method" },
  { key: "email_status", label: "Email Status" },
  { key: "email_source", label: "Email Source" },
  { key: "enrichment_notes", label: "Enrichment Notes" },
  { key: "outreach_readiness", label: "Outreach Readiness" },
  { key: "estimated_opportunity", label: "Estimated Opportunity" },
  { key: "rating", label: "Rating" },
  { key: "review_count", label: "Review Count" },
  { key: "score", label: "Score" },
  { key: "priority", label: "Priority" },
  { key: "opportunity_type", label: "Opportunity Type" },
  { key: "why_now", label: "Why Now" },
  { key: "reason", label: "Reason" },
  { key: "outreach", label: "Outreach" },
  { key: "maps_url", label: "Maps URL" },
  { key: "top_lead", label: "Top Lead" },
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
