import { buildCsv } from "@/lib/csv";

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
    return "No website present — clear opportunity to improve how new patients discover your practice";
  }
  const rating = input.rating;
  const rc = input.review_count;
  if (rating !== null && rating !== undefined && Number(rating) < 4.0) {
    return "Lower rating suggests a reputation fix could improve patient bookings";
  }
  if (rc !== null && rc !== undefined && Number(rc) < 20) {
    return "Low review volume suggests strong opportunity to grow local visibility quickly";
  }
  if (rc !== null && rc !== undefined && Number(rc) < 75) {
    return "Moderate review volume suggests room to expand patient demand";
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
  return "Practice appears established but may still have room to improve patient flow";
}

export type LeadPackCsvRow = {
  name: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  review_count: number | null;
  score: number | null;
  priority: string | null;
  opportunity_type: string | null;
  why_now: string;
  reason: string | null;
  outreach: string | null;
  maps_url: string | null;
  top_lead: "Yes" | "No";
};

const CSV_COLUMN_ORDER: Array<{ key: keyof LeadPackCsvRow; label: string }> = [
  { key: "name", label: "Name" },
  { key: "address", label: "Address" },
  { key: "website", label: "Website" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
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

function buildSectionCsv(rows: LeadPackCsvRow[]): string {
  const labels = CSV_COLUMN_ORDER.map((c) => c.label);
  if (rows.length === 0) {
    return labels.join(",");
  }
  const labeledRows: Record<string, unknown>[] = rows.map((row) => {
    const rec: Record<string, unknown> = {};
    for (const { key, label } of CSV_COLUMN_ORDER) {
      const v = row[key];
      rec[label] = v === null || v === undefined ? "" : v;
    }
    return rec;
  });
  return buildCsv(labeledRows, labels as (keyof (typeof labeledRows)[0])[]);
}

/** Top 10 first (duplicate allowed in full section), premium headers, UTF-8 BOM added by route. */
export function buildLeadPackCsv(sortedFull: LeadPackCsvRow[], top10: LeadPackCsvRow[]): string {
  const lines: string[] = [
    "TOP 10 HIGH-OPPORTUNITY PRACTICES",
    "",
    buildSectionCsv(top10),
    "",
    "FULL LEAD PACK",
    "",
    buildSectionCsv(sortedFull),
  ];
  return lines.join("\n");
}

export function logExportPrioritySummary(rows: LeadPackCsvRow[], topCount: number): void {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const r of rows) {
    const p = (r.priority ?? "").toLowerCase();
    if (p === "high") high += 1;
    else if (p === "medium") medium += 1;
    else if (p === "low") low += 1;
  }
  console.log(
    `[export] priorityHigh=${high} priorityMedium=${medium} priorityLow=${low} topLeadsInCsv=${topCount} totalRows=${rows.length}`
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
