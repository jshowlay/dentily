import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlaceDetails, searchBusinesses } from "@/lib/google-places";
import { createSearch, getSearchWithLeads, insertLeads, setSearchStatus } from "@/lib/db";
import { dedupeLeads } from "@/lib/dedupe-leads";
import { ensureMinimumHighPriority, type DentistScoringBatchContext } from "@/lib/dentist-scoring";
import { logSearchPrioritySummary, sortByPriorityThenScore } from "@/lib/lead-pack-export";
import { scoreLead } from "@/lib/score-lead";
import { logDentistScoringBatch } from "@/lib/scoring-log";
import { Lead } from "@/lib/types";
import { getNicheConfig } from "@/lib/niches";
import { EMPTY_LEAD_ENRICHMENT, PENDING_ENRICHMENT } from "@/lib/types";

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

function filterLeadsForQualityAndNiche(leads: Lead[], niche: string, nicheId: string): Lead[] {
  return leads.filter((lead) => {
    const reviewCount = lead.reviewCount ?? 0;
    if (!lead.website && !lead.phone && reviewCount < 5) return false;
    if (!seemsRelevantToNiche(lead.primaryType, lead.name, niche, nicheId)) return false;
    return true;
  });
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: { message: "Missing DATABASE_URL in environment variables." } },
        { status: 500 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Request body must be valid JSON." } },
        { status: 400 }
      );
    }

    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Invalid request payload.", details: parsed.error.issues } },
        { status: 400 }
      );
    }
    const { niche, location } = parsed.data;
    const nicheConfig = getNicheConfig(niche);

    let searchId: number;
    try {
      searchId = await createSearch(niche, location);
    } catch (dbError) {
      console.error("[api/search] createSearch failed:", dbError);
      const hint =
        dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json(
        {
          error: {
            message:
              process.env.NODE_ENV === "development"
                ? `Database error (create search): ${hint}`
                : "Could not save your search. Check DATABASE_URL and that the database is running and reachable.",
          },
        },
        { status: 500 }
      );
    }

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
        ...EMPTY_LEAD_ENRICHMENT,
        phone: l.phone,
        rating: l.rating,
        reviewCount: l.reviewCount,
        primaryType: l.primaryType,
        mapsUrl: l.mapsUrl,
        metadata: l.metadata ?? {},
        status: "new",
      }));
      console.log(`[api/search] totalNormalizedResults=${normalizedLeads.length}`);

      const withPlaceAndName = normalizedLeads.filter((l) => {
        const placeId = normalizeText(l.placeId);
        const name = (l.name ?? "").trim();
        return Boolean(placeId && name);
      });
      const dedupedOnce = dedupeLeads(withPlaceAndName);
      const filteredLeads = filterLeadsForQualityAndNiche(dedupedOnce, niche, nicheConfig.id).slice(
        0,
        TARGET_LEAD_COUNT
      );
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

      const dedupedForScoring = dedupeLeads(filteredLeads).slice(0, TARGET_LEAD_COUNT);

      const dentistBatch: DentistScoringBatchContext | undefined =
        nicheConfig.id === "dentists"
          ? { allNamesLower: dedupedForScoring.map((l) => l.name.toLowerCase()) }
          : undefined;

      // Score leads with AI.
      let failedAIScores = 0;
      const dentistScoringLog: Array<{
        baseScore: number;
        finalScore: number;
        opportunityType: string;
        priority: string;
      }> = [];

      const scoredLeadsRaw = await Promise.all(
        dedupedForScoring.map(async (lead) => {
          const scored = await scoreLead(lead, nicheConfig, dentistBatch);
          if (scored.usedAiFallback) failedAIScores += 1;
          if (nicheConfig.id === "dentists" && scored.dentistScoringMeta) {
            dentistScoringLog.push({
              baseScore: scored.dentistScoringMeta.baseScore,
              finalScore: scored.score ?? 0,
              opportunityType: scored.opportunityType ?? "unknown",
              priority: scored.priority ?? "low",
            });
          }
          console.log(`[api/search] aiScored placeId=${lead.placeId} score=${scored.score}`);
          return {
            ...lead,
            score: scored.score,
            reason: scored.reason,
            outreach: scored.outreach,
            opportunityType: scored.opportunityType,
            priority: scored.priority,
            status: "new",
          };
        })
      );

      const scoredLeads =
        nicheConfig.id === "dentists"
          ? ensureMinimumHighPriority(scoredLeadsRaw, { minHigh: 5 })
          : scoredLeadsRaw;
      console.log(`[api/search] scoredCount=${scoredLeads.length} failedAIScores=${failedAIScores}`);
      {
        const sortedForTop = sortByPriorityThenScore(scoredLeads);
        logSearchPrioritySummary(scoredLeads, Math.min(10, sortedForTop.length));
      }
      if (nicheConfig.id === "dentists") {
        logDentistScoringBatch(dentistScoringLog);
      }

      const leadsForInsert = scoredLeads.map((l) => ({
        ...l,
        ...PENDING_ENRICHMENT,
      }));
      console.log(
        `[api/search] insert fast path count=${leadsForInsert.length} (email enrich runs via POST /api/search/${searchId}/enrich)`
      );

      const inserted = await insertLeads(searchId, leadsForInsert);
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
    console.error("[api/search] unexpected error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: "Invalid request payload.", details: error.issues } },
        { status: 400 }
      );
    }

    const hint = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          message:
            process.env.NODE_ENV === "development"
              ? `Server error: ${hint}`
              : "Server error while processing request.",
        },
      },
      { status: 500 }
    );
  }
}
