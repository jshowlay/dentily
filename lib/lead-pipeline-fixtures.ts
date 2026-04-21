import type { ExportLeadRow } from "@/lib/types";

export function makeFixtureExportRow(
  p: Partial<ExportLeadRow> & Pick<ExportLeadRow, "name" | "address">
): ExportLeadRow {
  return {
    name: p.name,
    address: p.address ?? null,
    website: p.website ?? null,
    phone: p.phone ?? null,
    primary_email: p.primary_email ?? null,
    contact_form_url: p.contact_form_url ?? null,
    email_status: p.email_status ?? "pending",
    email_source: p.email_source ?? null,
    enrichment_notes: p.enrichment_notes ?? null,
    email_rejection_reason: p.email_rejection_reason ?? null,
    contactable: Boolean(p.primary_email || p.contact_form_url || p.phone),
    outreach_readiness: p.outreach_readiness ?? "medium",
    rating: p.rating ?? null,
    review_count: p.review_count ?? null,
    score: p.score ?? 50,
    reason: p.reason ?? null,
    outreach: p.outreach ?? null,
    priority: p.priority ?? "medium",
    opportunity_type: p.opportunity_type ?? null,
    primary_type: p.primary_type ?? "dentist",
    maps_url: p.maps_url ?? null,
    created_at: p.created_at ?? null,
  };
}

export const FRONTIER_TRAIL_FIXTURE_ADDRESS = "4419 Frontier Trail # 104, Austin, TX 78745";

/** Shared sample rows for pipeline tests and optional `dentily-austin-dental-leads-fixed.csv` regen. */
export const AUSTIN_PIPELINE_SAMPLE_EXPORT: ExportLeadRow[] = [
  makeFixtureExportRow({
    name: "South Austin Dental Associates",
    address: FRONTIER_TRAIL_FIXTURE_ADDRESS,
    phone: "512-555-0001",
    rating: 4.9,
    review_count: 170,
    website: "https://example.com/south",
    score: 72,
  }),
  makeFixtureExportRow({
    name: "Austin Emergency Dental",
    address: FRONTIER_TRAIL_FIXTURE_ADDRESS,
    phone: "512-555-0002",
    rating: 4.8,
    review_count: 160,
    website: "https://example.com/emergency",
    score: 68,
  }),
  makeFixtureExportRow({
    name: "Authentic Smiles",
    address: "1 Main St, Austin, TX",
    phone: "512-555-0003",
    rating: 5.0,
    review_count: 288,
    website: "https://example.com/authentic",
    score: 55,
  }),
  makeFixtureExportRow({
    name: "West Lake Hills Dental",
    address: "2 Oak Ln, Austin, TX",
    phone: "512-555-0004",
    rating: 5.0,
    review_count: 172,
    website: "https://example.com/westlake",
    score: 58,
  }),
];
