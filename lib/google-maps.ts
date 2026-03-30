import { EMPTY_LEAD_ENRICHMENT, Lead } from "@/lib/types";
import { getPlaceDetails, searchBusinesses } from "@/lib/google-places";

/**
 * Backwards-compatible wrapper.
 *
 * NOTE: The app's live path should use `lib/google-places.ts` directly.
 */
export async function fetchGoogleMapsLeads(niche: string, location: string): Promise<Lead[]> {
  const query = `${niche} in ${location}`;
  const leads = await searchBusinesses(query);

  // Ensure we have website + phone when possible.
  const needsDetails = leads.filter((l) => !l.website || !l.phone);
  if (needsDetails.length > 0) {
    const detailsById = await Promise.all(
      needsDetails.map(async (l) => ({
        placeId: l.placeId,
        details: await getPlaceDetails(l.placeId),
      }))
    );

    const detailsMap = new Map(detailsById.map((d) => [d.placeId, d.details]));
    return leads.map((l) => {
      const details = detailsMap.get(l.placeId);
      if (!details) return { ...l, ...EMPTY_LEAD_ENRICHMENT } as Lead;
      return {
        ...l,
        ...EMPTY_LEAD_ENRICHMENT,
        website: l.website ?? details.website,
        phone: l.phone ?? details.phone,
        rating: l.rating ?? details.rating,
        reviewCount: l.reviewCount ?? details.reviewCount,
        primaryType: l.primaryType ?? details.primaryType,
        address: l.address ?? details.address,
        mapsUrl: l.mapsUrl ?? details.mapsUrl,
        metadata: {
          ...(l.metadata ?? {}),
          details: details.metadata?.raw ? details.metadata : details.metadata,
        },
      } as Lead;
    });
  }

  return leads.map((l) => ({ ...l, ...EMPTY_LEAD_ENRICHMENT })) as Lead[];
}
