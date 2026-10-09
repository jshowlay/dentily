import { getLeadScoringEvidence } from "@/lib/lead-scoring-evidence";
import { cleanPracticeDisplayName } from "@/lib/practice-display-name";
import type { ExportLeadRow, Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

/** True when export row carries search-time evidence (do not re-score for CSV). */
export function exportRowUsesPersistedScoring(row: ExportLeadRow): boolean {
  const meta = row.metadata ?? {};
  return getLeadScoringEvidence({ metadata: meta }) != null;
}

/** Map a CSV export row back into a Lead for scoring and outreach regeneration. */
export function exportRowToLead(row: ExportLeadRow, idx: number): Lead {
  const placeKey = (row.place_id ?? row.maps_url ?? row.name ?? `row-${idx}`).slice(0, 256);
  return {
    placeId: placeKey,
    name: cleanPracticeDisplayName(row.name ?? ""),
    niche: "dentists",
    address: row.address,
    website: row.website,
    ...EMPTY_LEAD_ENRICHMENT,
    primaryEmail: row.primary_email,
    contactFormUrl: row.contact_form_url,
    emailStatus: (row.email_status as Lead["emailStatus"]) ?? null,
    emailSource: (row.email_source as Lead["emailSource"]) ?? null,
    enrichmentNotes: row.enrichment_notes,
    emailRejectionReason: row.email_rejection_reason ?? null,
    phone: row.phone,
    rating: row.rating,
    reviewCount: row.review_count,
    primaryType: row.primary_type,
    mapsUrl: row.maps_url,
    metadata: row.metadata ?? {},
    score: row.score ?? undefined,
    reason: row.reason ?? undefined,
    outreach: row.outreach ?? undefined,
    opportunityType: row.opportunity_type ?? null,
    priority: row.priority ?? null,
  };
}
