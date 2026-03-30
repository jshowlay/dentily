import type { Lead } from "@/lib/types";

/**
 * Strip server-only / non-JSON-safe values before passing leads to Client Components.
 * (Next.js rejects some nested structures; large Google metadata blobs can also cause issues.)
 */
export function sanitizeLeadsForClient(leads: Lead[]): Lead[] {
  return leads.map((l) => ({
    placeId: String(l.placeId ?? ""),
    name: String(l.name ?? ""),
    niche: l.niche ?? null,
    address: l.address ?? null,
    website: l.website ?? null,
    primaryEmail: l.primaryEmail ?? null,
    contactFormUrl: l.contactFormUrl ?? null,
    emailStatus: l.emailStatus ?? null,
    emailSource: l.emailSource ?? null,
    enrichmentNotes: l.enrichmentNotes ?? null,
    phone: l.phone ?? null,
    rating: l.rating == null ? null : Number(l.rating),
    reviewCount: l.reviewCount == null ? null : Number(l.reviewCount),
    primaryType: l.primaryType ?? null,
    mapsUrl: l.mapsUrl ?? null,
    score: l.score == null ? undefined : Number(l.score),
    reason: l.reason ?? undefined,
    outreach: l.outreach ?? undefined,
    opportunityType: l.opportunityType ?? null,
    priority: l.priority ?? null,
    status: l.status ?? undefined,
    createdAt: l.createdAt,
    metadata: {},
  }));
}
