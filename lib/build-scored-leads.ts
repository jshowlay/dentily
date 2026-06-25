import { getPlaceDetails, MAX_RAW_RESULTS, searchBusinesses } from "@/lib/google-places";
import { dedupeLeads } from "@/lib/dedupe-leads";
import { type DentistScoringBatchContext } from "@/lib/dentist-scoring";
import { logSearchPrioritySummary, sortByPriorityThenScore } from "@/lib/lead-pack-export";
import { scoreDentistLeadsBatched, scoreLead } from "@/lib/score-lead";
import { logDentistScoringBatch } from "@/lib/scoring-log";
import { getExistingPracticeIdsForUser } from "@/lib/subscription-db";
import type { NicheConfig } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT, type Lead } from "@/lib/types";

export const TARGET_LEAD_COUNT = 150;

const INTERMEDIATE_LEAD_CAP = 200;

const dentalTerms = [
  "dentist",
  "dental office",
  "dental clinic",
  "orthodontist",
  "oral surgeon",
  "periodontist",
  "pediatric dentist",
];

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

export type BuildScoredLeadsParams = {
  niche: string;
  location: string;
  nicheConfig: NicheConfig;
  subscriptionUserId: number | null;
  searchId: number;
};

export async function buildScoredLeads(params: BuildScoredLeadsParams): Promise<Lead[]> {
  const { niche, location, nicheConfig, subscriptionUserId, searchId } = params;

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY.");
  }

  const terms =
    nicheConfig.id === "dentists" ? dentalTerms : [`${niche} in ${location}`];

  const allRaw = await Promise.all(
    terms.map((term) =>
      searchBusinesses(
        nicheConfig.id === "dentists" ? `${term} in ${location}` : term,
        MAX_RAW_RESULTS
      )
    )
  );

  const seenPlaceIds = new Set<string>();
  const found = allRaw.flat().filter((l) => {
    if (seenPlaceIds.has(l.placeId)) return false;
    seenPlaceIds.add(l.placeId);
    return true;
  });

  console.log(
    `[build-scored-leads] searchId=${searchId} terms=${terms.length} totalRawResults=${found.length}`
  );

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

  const withPlaceAndName = normalizedLeads.filter((l) => {
    const placeId = normalizeText(l.placeId);
    const name = (l.name ?? "").trim();
    return Boolean(placeId && name);
  });
  const dedupedOnce = dedupeLeads(withPlaceAndName);
  let filteredLeads = filterLeadsForQualityAndNiche(dedupedOnce, niche, nicheConfig.id).slice(
    0,
    INTERMEDIATE_LEAD_CAP
  );

  if (subscriptionUserId) {
    const seen = await getExistingPracticeIdsForUser(subscriptionUserId);
    const before = filteredLeads.length;
    filteredLeads = filteredLeads.filter((l) => !seen.has(l.placeId));
    console.log(
      `[build-scored-leads] subscription dedupe removed=${before - filteredLeads.length}`
    );
  }

  filteredLeads = filteredLeads.slice(0, TARGET_LEAD_COUNT);

  if (filteredLeads.length === 0) {
    return [];
  }

  const needsDetails = filteredLeads.filter((l) => !l.website || !l.phone);
  if (needsDetails.length > 0) {
    const detailsById = await Promise.allSettled(
      needsDetails.map(async (lead) => {
        const details = await getPlaceDetails(lead.placeId);
        return { placeId: lead.placeId, details };
      })
    );
    const map = new Map(
      detailsById
        .filter(
          (
            d
          ): d is PromiseFulfilledResult<{
            placeId: string;
            details: Awaited<ReturnType<typeof getPlaceDetails>>;
          }> => d.status === "fulfilled"
        )
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
      if (lead.reviewCount === null && details.reviewCount !== null) {
        lead.reviewCount = details.reviewCount;
      }
      if (!lead.primaryType) lead.primaryType = details.primaryType;
      if (!lead.address) lead.address = details.address;
      if (!lead.mapsUrl) lead.mapsUrl = details.mapsUrl;
    }
  }

  const dedupedForScoring = dedupeLeads(filteredLeads).slice(0, INTERMEDIATE_LEAD_CAP);

  const dentistBatch: DentistScoringBatchContext | undefined =
    nicheConfig.id === "dentists"
      ? { allNamesLower: dedupedForScoring.map((l) => l.name.toLowerCase()) }
      : undefined;

  let failedAIScores = 0;
  const dentistScoringLog: Array<{
    baseScore: number;
    finalScore: number;
    opportunityType: string;
    priority: string;
  }> = [];

  let scoredLeadsRaw: Lead[];

  if (nicheConfig.id === "dentists") {
    const batchScored = await scoreDentistLeadsBatched(dedupedForScoring, dentistBatch);
    scoredLeadsRaw = dedupedForScoring.map((lead, i) => {
      const scored = batchScored[i]!;
      if (scored.usedAiFallback) failedAIScores += 1;
      if (scored.dentistScoringMeta) {
        dentistScoringLog.push({
          baseScore: scored.dentistScoringMeta.baseScore,
          finalScore: scored.score ?? 0,
          opportunityType: scored.opportunityType ?? "unknown",
          priority: scored.priority ?? "low",
        });
      }
      return {
        ...lead,
        score: scored.score,
        reason: scored.reason,
        outreach: scored.outreach,
        opportunityType: scored.opportunityType,
        priority: scored.priority,
        status: "new",
      };
    });
  } else {
    scoredLeadsRaw = await Promise.all(
      dedupedForScoring.map(async (lead) => {
        const scored = await scoreLead(lead, nicheConfig, dentistBatch);
        if (scored.usedAiFallback) failedAIScores += 1;
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
  }

  console.log(
    `[build-scored-leads] searchId=${searchId} scoredCount=${scoredLeadsRaw.length} failedAIScores=${failedAIScores}`
  );
  logSearchPrioritySummary(scoredLeadsRaw, Math.min(10, scoredLeadsRaw.length));
  if (nicheConfig.id === "dentists") {
    logDentistScoringBatch(dentistScoringLog);
  }

  return sortByPriorityThenScore(scoredLeadsRaw);
}
