import { classifyDentalSpecialty, type DentalSpecialty } from "@/lib/dental-specialty";
import { MIN_REVIEWS_FOR_RATING_SIGNALS } from "@/lib/lead-quality-filters";
import type { Lead } from "@/lib/types";

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export type MarketBenchmarks = {
  medianRating: number | null;
  medianReviewCount: number | null;
  ratingSampleSize: number;
  reviewSampleSize: number;
};

function collectBenchmarksForLeads(leads: Lead[]): MarketBenchmarks {
  const ratings: number[] = [];
  const reviews: number[] = [];

  for (const lead of leads) {
    const r = lead.rating;
    const rc = lead.reviewCount;
    if (r !== null && r !== undefined && Number.isFinite(Number(r))) {
      const rcN = rc !== null && rc !== undefined ? Number(rc) : 0;
      if (rcN >= MIN_REVIEWS_FOR_RATING_SIGNALS) {
        ratings.push(Number(r));
      }
    }
    if (rc !== null && rc !== undefined && Number.isFinite(Number(rc)) && Number(rc) > 0) {
      reviews.push(Number(rc));
    }
  }

  ratings.sort((a, b) => a - b);
  reviews.sort((a, b) => a - b);

  return {
    medianRating: median(ratings),
    medianReviewCount: median(reviews),
    ratingSampleSize: ratings.length,
    reviewSampleSize: reviews.length,
  };
}

/** Medians over the full search batch (general dentist default). */
export function computeMarketBenchmarks(leads: Lead[]): MarketBenchmarks {
  return collectBenchmarksForLeads(leads);
}

const MIN_PEER_GROUP_SIZE = 2;

export type MarketBenchmarksBySpecialty = Map<DentalSpecialty, MarketBenchmarks>;

/** Per-specialty medians so orthodontists etc. compare to their peer type. */
export function computeMarketBenchmarksBySpecialty(leads: Lead[]): MarketBenchmarksBySpecialty {
  const buckets = new Map<DentalSpecialty, Lead[]>();
  for (const lead of leads) {
    const key = classifyDentalSpecialty(lead);
    const arr = buckets.get(key) ?? [];
    arr.push(lead);
    buckets.set(key, arr);
  }
  const out: MarketBenchmarksBySpecialty = new Map();
  for (const [key, group] of Array.from(buckets.entries())) {
    out.set(key, collectBenchmarksForLeads(group));
  }
  return out;
}

export type LeadMarketContext = {
  specialty: DentalSpecialty;
  benchmarks: MarketBenchmarks;
  /** When false, do not compare review count to market (specialist with no peer group). */
  compareReviewVolume: boolean;
};

export function marketContextForLead(
  lead: Lead,
  bySpecialty: MarketBenchmarksBySpecialty,
  fallback: MarketBenchmarks
): LeadMarketContext {
  const specialty = classifyDentalSpecialty(lead);
  const cohort = bySpecialty.get(specialty) ?? fallback;
  const general = bySpecialty.get("general") ?? fallback;

  if (specialty === "general") {
    return { specialty, benchmarks: general, compareReviewVolume: true };
  }

  const peerCount = cohort.reviewSampleSize;
  const benchmarks =
    peerCount >= MIN_PEER_GROUP_SIZE ? cohort : general;

  return {
    specialty,
    benchmarks,
    /** Specialists: only compare review volume within same type; skip if too few peers. */
    compareReviewVolume: peerCount >= MIN_PEER_GROUP_SIZE,
  };
}
