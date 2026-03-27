import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlaceDetails, searchBusinesses } from "@/lib/google-places";
import { createSearch, getSearchWithLeads, insertLeads, setSearchStatus } from "@/lib/db";
import { scoreLead } from "@/lib/score-lead";
import { Lead } from "@/lib/types";
import { getNicheConfig } from "@/lib/niches";

const TARGET_LEAD_COUNT = 50;

const searchSchema = z.object({
  niche: z.string().trim().min(2),
  location: z.string().trim().min(2),
});

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function nicheTokenSet(niche: string): Set<string> {
  const tokens = normalizeText(niche)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  return new Set(tokens);
}

function seemsRelevantToNiche(
  primaryType: string | null,
  name: string,
  niche: string,
  nicheId: string
): boolean {
  const pt = normalizeText(primaryType);
  const nm = normalizeText(name);
  if (nicheId === "dentists") {
    return (
      pt.includes("dentist") ||
      pt.includes("dental") ||
      nm.includes("dent") ||
      nm.includes("orthodont")
    );
  }

  const tokens = nicheTokenSet(niche);
  if (tokens.size === 0) return true;

  for (const token of Array.from(tokens)) {
    if (pt.includes(token) || nm.includes(token)) return true;
  }

  // Keep broad service categories unless obviously irrelevant.
  const clearlyIrrelevant = [
    "airport",
    "political",
    "government",
    "university",
    "school",
    "museum",
    "park",
    "embassy",
    "post_office",
  ];
  return !clearlyIrrelevant.some((bad) => pt.includes(bad));
}

function filterAndDedupeLeads(leads: Lead[], niche: string, nicheId: string): Lead[] {
  const out: Lead[] = [];
  const seenPlaceIds = new Set<string>();
  const seenNamePhone = new Set<string>();

  for (const lead of leads) {
    const placeId = normalizeText(lead.placeId);
    const name = (lead.name ?? "").trim();
    const phone = normalizeText(lead.phone);
    const reviewCount = lead.reviewCount ?? 0;

    if (!placeId || !name) continue;
    if (seenPlaceIds.has(placeId)) continue;

    const namePhoneKey = `${normalizeText(name)}::${phone}`;
    if (phone && seenNamePhone.has(namePhoneKey)) continue;

    if (!lead.website && !lead.phone && reviewCount < 5) continue;
    if (!seemsRelevantToNiche(lead.primaryType, lead.name, niche, nicheId)) continue;

    seenPlaceIds.add(placeId);
    if (phone) seenNamePhone.add(namePhoneKey);
    out.push(lead);
    if (out.length >= TARGET_LEAD_COUNT) break;
  }
  return out;
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: { message: "Missing DATABASE_URL in environment variables." } },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { niche, location } = searchSchema.parse(body);
    const nicheConfig = getNicheConfig(niche);

    const searchId = await createSearch(niche, location);
    console.log(
      `[api/search] niche="${niche}" nicheId=${nicheConfig.id} location="${location}" searchId=${searchId}`
    );

    try {
      if (!process.env.GOOGLE_MAPS_API_KEY) {
        await setSearchStatus(searchId, "failed", { errorMessage: "Missing GOOGLE_MAPS_API_KEY." });
        return NextResponse.json(
          { error: { message: "Missing GOOGLE_MAPS_API_KEY." } },
          { status: 500 }
        );
      }

      const query = `${niche} in ${location}`;
      const found = await searchBusinesses(query, TARGET_LEAD_COUNT);
      console.log(`[api/search] totalRawResults=${found.length}`);

      const normalizedLeads: Lead[] = found.map((l) => ({
        placeId: l.placeId,
        name: l.name,
        niche: nicheConfig.name,
        address: l.address,
        website: l.website,
        email: null,
        phone: l.phone,
        rating: l.rating,
        reviewCount: l.reviewCount,
        primaryType: l.primaryType,
        mapsUrl: l.mapsUrl,
        metadata: l.metadata ?? {},
        status: "new",
      }));
      console.log(`[api/search] totalNormalizedResults=${normalizedLeads.length}`);

      const filteredLeads = filterAndDedupeLeads(normalizedLeads, niche, nicheConfig.id);
      console.log(`[api/search] totalDedupedResults=${filteredLeads.length}`);

      if (filteredLeads.length === 0) {
        await setSearchStatus(searchId, "completed", { resultCount: 0 });
        return NextResponse.json({
          searchId,
          niche,
          location,
          status: "completed",
          resultCount: 0,
          leads: [],
        });
      }

      // Enrich missing details after dedupe/filter to reduce API calls.
      const needsDetails = filteredLeads.filter((l) => !l.website || !l.phone);
      if (needsDetails.length > 0) {
        console.log(`[api/search] enrichingMissingDetails count=${needsDetails.length}`);
        const detailsById = await Promise.allSettled(
          needsDetails.map(async (lead) => {
            const details = await getPlaceDetails(lead.placeId);
            return { placeId: lead.placeId, details };
          })
        );
        const map = new Map(
          detailsById
            .filter((d): d is PromiseFulfilledResult<{ placeId: string; details: Awaited<ReturnType<typeof getPlaceDetails>> }> => d.status === "fulfilled")
            .map((d) => [d.value.placeId, d.value.details])
        );

        for (const lead of filteredLeads) {
          const details = map.get(lead.placeId);
          if (!details) continue;
          const searchRaw = lead.metadata?.raw ?? null;
          const detailsRaw = details.metadata?.raw ?? null;
          lead.metadata = {
            provider: "google_places",
            searchText: searchRaw,
            placeDetails: detailsRaw,
          };

          if (!lead.website) lead.website = details.website;
          if (!lead.phone) lead.phone = details.phone;
          if (lead.rating === null && details.rating !== null) lead.rating = details.rating;
          if (lead.reviewCount === null && details.reviewCount !== null) lead.reviewCount = details.reviewCount;
          if (!lead.primaryType) lead.primaryType = details.primaryType;
          if (!lead.address) lead.address = details.address;
          if (!lead.mapsUrl) lead.mapsUrl = details.mapsUrl;
        }
      }

      // Score leads with AI.
      let failedAIScores = 0;
      const scoredLeads = await Promise.all(
        filteredLeads.map(async (lead) => {
          const scored = await scoreLead(lead, nicheConfig);
          if (
            scored.score === 50 &&
            scored.reason === "Potential local business lead with possible growth opportunity."
          ) {
            failedAIScores += 1;
          }
          console.log(`[api/search] aiScored placeId=${lead.placeId} score=${scored.score}`);
          return { ...lead, ...scored, status: "new" };
        })
      );
      console.log(`[api/search] scoredCount=${scoredLeads.length} failedAIScores=${failedAIScores}`);

      const inserted = await insertLeads(searchId, scoredLeads);
      console.log(`[api/search] dbInsertedLeads count=${inserted}`);
      await setSearchStatus(searchId, "completed", { resultCount: inserted });
      const savedSearch = await getSearchWithLeads(searchId);
      const savedLeads = savedSearch?.leads ?? [];

      return NextResponse.json({
        searchId,
        niche,
        location,
        status: "completed",
        resultCount: inserted,
        leads: savedLeads,
      });
    } catch (innerError) {
      console.error("[api/search] processing failed:", innerError);
      await setSearchStatus(
        searchId,
        "failed",
        { errorMessage: innerError instanceof Error ? innerError.message : "Unknown processing error" }
      );
      return NextResponse.json(
        {
          error: {
            message:
              innerError instanceof Error ? innerError.message : "Processing error while generating leads",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: "Invalid request payload.", details: error.issues } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { message: "Server error while processing request." } },
      { status: 500 }
    );
  }
}
