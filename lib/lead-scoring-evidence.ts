import { type DentalSpecialty } from "@/lib/dental-specialty";
import {
  computeMarketBenchmarksBySpecialty,
  marketContextForLead,
  type MarketBenchmarks,
} from "@/lib/market-benchmarks";
import { MIN_REVIEWS_FOR_RATING_SIGNALS } from "@/lib/lead-quality-filters";
import { NO_WEBSITE_EXPORT_REASON_LINE } from "@/lib/no-website-signal";
import { fetchReviewRecencyMap } from "@/lib/google-places";
import type { WebsiteAudit } from "@/lib/website-evidence";
import { auditWebsite, mapPool } from "@/lib/website-evidence";
import type { Lead } from "@/lib/types";
import { computeBaseScore } from "@/lib/dentist-scoring";

export const SCORING_EVIDENCE_METADATA_KEY = "scoringEvidence";

export type LeadScoringEvidence = {
  marketMedianRating: number | null;
  marketMedianReviewCount: number | null;
  daysSinceLastReview: number | null;
  /** Legacy Place Details reviews_sort=newest; when false, recency gaps are omitted. */
  reviewRecencyEnabled: boolean;
  /** Per-place: newest-sort timestamps verified non-increasing. */
  reviewRecencyConfirmed: boolean;
  noReviewIn90Days: boolean;
  ratingVsMarket: string | null;
  reviewsVsMarket: string | null;
  website: {
    httpsOk: boolean | null;
    hasOnlineBooking: boolean | null;
    copyrightYear: number | null;
    staleCopyright: boolean;
    mobilePerformanceScore: number | null;
    slowMobile: boolean;
  } | null;
  gaps: string[];
};

export function getLeadScoringEvidence(lead: Pick<Lead, "metadata">): LeadScoringEvidence | null {
  const raw = lead.metadata?.[SCORING_EVIDENCE_METADATA_KEY];
  if (!raw || typeof raw !== "object") return null;
  return raw as LeadScoringEvidence;
}

const REVIEW_STALE_DAYS = 90;
const RATING_MEDIAN_DELTA = 0.15;
const REVIEW_MEDIAN_RATIO = 0.75;

function formatRating(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function peerLabel(specialty: DentalSpecialty): string {
  if (specialty === "general") return "practices in this run";
  return `${specialty.replace(/_/g, " ")} peers in this run`;
}

export function buildLeadScoringEvidence(input: {
  lead: Lead;
  market: MarketBenchmarks;
  specialty: DentalSpecialty;
  compareReviewVolume: boolean;
  daysSinceLastReview: number | null;
  reviewRecencyEnabled: boolean;
  reviewRecencyConfirmed: boolean;
  websiteAudit: WebsiteAudit | null;
}): LeadScoringEvidence {
  const {
    lead,
    market,
    specialty,
    compareReviewVolume,
    daysSinceLastReview,
    reviewRecencyEnabled,
    reviewRecencyConfirmed,
    websiteAudit,
  } = input;
  const gaps: string[] = [];
  const rating = lead.rating;
  const rc = lead.reviewCount;
  const ratingCounts = (rc ?? 0) >= MIN_REVIEWS_FOR_RATING_SIGNALS;

  let ratingVsMarket: string | null = null;
  if (
    rating !== null &&
    rating !== undefined &&
    market.medianRating !== null &&
    ratingCounts
  ) {
    const med = market.medianRating;
    if (rating < med - RATING_MEDIAN_DELTA) {
      ratingVsMarket = `${formatRating(Number(rating))} stars vs. a ${formatRating(med)} local median`;
      gaps.push(`Google rating is ${ratingVsMarket} among ${peerLabel(specialty)}.`);
    }
  }

  let reviewsVsMarket: string | null = null;
  if (
    compareReviewVolume &&
    rc !== null &&
    rc !== undefined &&
    market.medianReviewCount !== null &&
    Number(rc) >= MIN_REVIEWS_FOR_RATING_SIGNALS
  ) {
    const med = market.medianReviewCount;
    if (Number(rc) < med * REVIEW_MEDIAN_RATIO) {
      reviewsVsMarket = `${rc} reviews vs. a ${Math.round(med)} local median`;
      gaps.push(`Review volume is ${reviewsVsMarket} among ${peerLabel(specialty)}.`);
    }
  }

  const noReviewIn90Days =
    reviewRecencyEnabled &&
    reviewRecencyConfirmed &&
    daysSinceLastReview !== null &&
    daysSinceLastReview > REVIEW_STALE_DAYS;
  if (noReviewIn90Days) {
    gaps.push(
      `No new Google reviews in the last ${REVIEW_STALE_DAYS} days (last visible review ~${daysSinceLastReview} days ago).`
    );
  }

  const site = (lead.website ?? "").trim();
  let websiteBlock: LeadScoringEvidence["website"] = null;
  if (site) {
    const httpsOk = websiteAudit?.httpsOk ?? null;
    websiteBlock = {
      httpsOk,
      hasOnlineBooking: websiteAudit?.hasOnlineBooking ?? null,
      copyrightYear: websiteAudit?.copyrightYear ?? null,
      staleCopyright: websiteAudit?.staleCopyright ?? false,
      mobilePerformanceScore: websiteAudit?.mobilePerformanceScore ?? null,
      slowMobile: websiteAudit?.slowMobile ?? false,
    };
    if (httpsOk === false) {
      gaps.push("Website is not served over HTTPS.");
    }
    if (websiteAudit?.hasOnlineBooking === false) {
      gaps.push("Homepage scan found no obvious online booking path.");
    }
    if (websiteAudit?.staleCopyright) {
      const y = websiteAudit.copyrightYear;
      gaps.push(
        y
          ? `Footer copyright still shows ${y}.`
          : "Footer copyright looks outdated."
      );
    }
    if (websiteAudit?.slowMobile && websiteAudit.mobilePerformanceScore !== null) {
      gaps.push(
        `Mobile PageSpeed ${websiteAudit.mobilePerformanceScore}/100 — likely slow on phones.`
      );
    }
  }

  if (!site) {
    gaps.unshift("No standalone website on file.");
  }

  return {
    marketMedianRating: market.medianRating,
    marketMedianReviewCount: market.medianReviewCount,
    daysSinceLastReview,
    reviewRecencyEnabled,
    reviewRecencyConfirmed,
    noReviewIn90Days,
    ratingVsMarket,
    reviewsVsMarket,
    website: websiteBlock,
    gaps,
  };
}

export function hasEvidenceBackedGap(evidence: LeadScoringEvidence | null): boolean {
  if (!evidence) return false;
  return evidence.gaps.length > 0;
}

/** Nudge rule score so strong peers without gaps sit below “high” band. */
export function evidenceScoreAdjustment(evidence: LeadScoringEvidence | null): number {
  if (!evidence) return -4;
  const n = evidence.gaps.length;
  if (n === 0) return -14;
  let adj = Math.min(18, 4 + n * 4);
  if (evidence.noReviewIn90Days) adj += 4;
  if (evidence.website?.slowMobile) adj += 3;
  if (evidence.ratingVsMarket) adj += 3;
  return adj;
}

export function primaryEvidenceReason(
  evidence: LeadScoringEvidence | null,
  lead: Pick<Lead, "website">
): string {
  if (evidence?.gaps.length) {
    return evidence.gaps[0]!;
  }
  if (!(lead.website ?? "").trim()) {
    return "No standalone website on file.";
  }
  return "No specific measurable gap vs. local peers on the signals we checked.";
}

export function computeWhyThisLeadFromLead(lead: Lead): string {
  const evidence = getLeadScoringEvidence(lead);
  const pri = (lead.priority ?? "").toLowerCase();
  const priLabel = pri === "high" ? "High" : pri === "medium" ? "Medium" : pri === "low" ? "Low" : "";

  if (evidence?.gaps.length) {
    const core = evidence.gaps.slice(0, 2).join(" ");
    const tail = priLabel ? ` (${priLabel} priority.)` : "";
    return `${core}${tail}`.trim();
  }

  const key = (lead.opportunityType ?? "").trim().toLowerCase();
  const ratingStr =
    lead.rating !== null && lead.rating !== undefined ? String(lead.rating) : "unknown";
  const rcStr =
    lead.reviewCount !== null && lead.reviewCount !== undefined
      ? String(lead.reviewCount)
      : "unknown";

  if (key === "no_website") {
    return `${NO_WEBSITE_EXPORT_REASON_LINE}${priLabel ? ` (${priLabel} priority.)` : ""}`;
  }
  if (key === "reputation_gap") {
    return `Public rating of ${ratingStr} is likely filtering them out of high-intent searches.${priLabel ? ` (${priLabel} priority.)` : ""}`;
  }
  if (key === "newer_unknown") {
    return `Early-stage practice with only ${rcStr} reviews — visibility and reputation-building is the immediate unlock.${priLabel ? ` (${priLabel} priority.)` : ""}`;
  }
  if (key === "high_volume_saturation") {
    return `Already dominant (${rcStr} reviews) — not a growth pitch.${priLabel ? ` (${priLabel} priority.)` : ""}`;
  }
  return `Strong fundamentals (${ratingStr} stars, ${rcStr} reviews) but no clear evidence-backed gap in this run.${priLabel ? ` (${priLabel} priority.)` : ""}`;
}

const WEBSITE_FETCH_CONCURRENCY = 6;
const DEFAULT_EXPENSIVE_CANDIDATE_LIMIT = 20;

export type ScoringEvidenceAttachOptions = {
  /** Review recency, homepage crawl, and PageSpeed run only for this many top prelim-score leads. */
  expensiveCandidateLimit?: number;
  /** When set, only these place IDs get recency / website / PageSpeed checks. */
  expensivePlaceIds?: Set<string>;
};

export async function attachScoringEvidenceToDentistLeads(
  leads: Lead[],
  opts?: ScoringEvidenceAttachOptions
): Promise<void> {
  if (leads.length === 0) return;

  const expensiveLimit = opts?.expensiveCandidateLimit ?? DEFAULT_EXPENSIVE_CANDIDATE_LIMIT;
  const t0 = Date.now();

  const bySpecialty = computeMarketBenchmarksBySpecialty(leads);
  const fallback = bySpecialty.get("general") ?? {
    medianRating: null,
    medianReviewCount: null,
    ratingSampleSize: 0,
    reviewSampleSize: 0,
  };

  const prelim = leads.map((lead) => ({
    lead,
    prelimScore: computeBaseScore(lead, { allNamesLower: leads.map((l) => l.name.toLowerCase()) }),
  }));
  prelim.sort((a, b) => b.prelimScore - a.prelimScore);

  const expensivePlaceIds =
    opts?.expensivePlaceIds ??
    new Set(prelim.slice(0, expensiveLimit).map(({ lead }) => lead.placeId).filter(Boolean));
  const pageSpeedPlaceIds = new Set(
    prelim
      .filter(({ lead }) => expensivePlaceIds.has(lead.placeId) && Boolean(lead.website?.trim()))
      .slice(0, expensiveLimit)
      .map(({ lead }) => lead.placeId)
  );

  const recencyBatch = await fetchReviewRecencyMap(Array.from(expensivePlaceIds), { concurrency: 8 });
  console.log(
    `[lead-scoring-evidence] recency enabled=${recencyBatch.enabled} expensiveN=${expensivePlaceIds.size} ms=${Date.now() - t0}`
  );

  const auditByPlaceId = new Map<string, WebsiteAudit | null>();
  const auditTargets = prelim
    .filter(({ lead }) => expensivePlaceIds.has(lead.placeId) && lead.website?.trim())
    .map(({ lead }) => lead);
  const tAudit = Date.now();
  await mapPool(auditTargets, WEBSITE_FETCH_CONCURRENCY, async (lead) => {
    const audit = await auditWebsite(lead.website, {
      runPageSpeed: pageSpeedPlaceIds.has(lead.placeId),
    });
    auditByPlaceId.set(lead.placeId, audit);
    return audit;
  });
  console.log(
    `[lead-scoring-evidence] website audits=${auditTargets.length} pageSpeed=${pageSpeedPlaceIds.size} ms=${Date.now() - tAudit}`
  );

  for (const lead of leads) {
    const ctx = marketContextForLead(lead, bySpecialty, fallback);
    const recency = recencyBatch.byPlaceId.get(lead.placeId) ?? {
      daysSinceLastReview: null,
      confirmed: false,
    };
    const websiteAudit = lead.website?.trim() ? auditByPlaceId.get(lead.placeId) ?? null : null;
    const evidence = buildLeadScoringEvidence({
      lead,
      market: ctx.benchmarks,
      specialty: ctx.specialty,
      compareReviewVolume: ctx.compareReviewVolume,
      daysSinceLastReview: recency.daysSinceLastReview,
      reviewRecencyEnabled: recencyBatch.enabled,
      reviewRecencyConfirmed: recency.confirmed,
      websiteAudit,
    });
    lead.metadata = {
      ...lead.metadata,
      [SCORING_EVIDENCE_METADATA_KEY]: evidence,
    };
  }
  console.log(`[lead-scoring-evidence] attach complete leads=${leads.length} ms=${Date.now() - t0}`);
}
