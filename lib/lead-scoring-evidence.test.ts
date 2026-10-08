import { describe, expect, it } from "vitest";
import {
  buildLeadScoringEvidence,
  hasEvidenceBackedGap,
  evidenceScoreAdjustment,
  SCORING_EVIDENCE_METADATA_KEY,
} from "@/lib/lead-scoring-evidence";
import { computeMarketBenchmarks } from "@/lib/market-benchmarks";
import { classifyOutreachArchetype } from "@/lib/marcus-outreach";
import type { Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

function stubLead(partial: Partial<Lead>): Lead {
  return {
    placeId: "p1",
    name: "Test Dental",
    address: "Austin, TX",
    website: "https://example.com",
    phone: "5125550100",
    rating: 4.4,
    reviewCount: 220,
    primaryType: "dentist",
    mapsUrl: "https://maps.google.com",
    metadata: {},
    ...EMPTY_LEAD_ENRICHMENT,
    ...partial,
  };
}

describe("market benchmarks", () => {
  it("computes medians from batch", () => {
    const leads = [
      stubLead({ rating: 4.0, reviewCount: 100 }),
      stubLead({ placeId: "p2", rating: 5.0, reviewCount: 300 }),
      stubLead({ placeId: "p3", rating: 4.8, reviewCount: 200 }),
    ];
    const m = computeMarketBenchmarks(leads);
    expect(m.medianRating).toBe(4.8);
    expect(m.medianReviewCount).toBe(200);
  });
});

describe("lead scoring evidence", () => {
  it("flags stale reviews and below-median rating", () => {
    const market = { medianRating: 4.8, medianReviewCount: 200, ratingSampleSize: 3, reviewSampleSize: 3 };
    const evidence = buildLeadScoringEvidence({
      lead: stubLead({ rating: 4.4, reviewCount: 220 }),
      market,
      specialty: "general",
      compareReviewVolume: true,
      daysSinceLastReview: 120,
      reviewRecencyEnabled: true,
      reviewRecencyConfirmed: true,
      websiteAudit: null,
    });
    expect(evidence.noReviewIn90Days).toBe(true);
    expect(evidence.ratingVsMarket).toMatch(/4\.4 stars vs/);
    expect(hasEvidenceBackedGap(evidence)).toBe(true);
    expect(evidenceScoreAdjustment(evidence)).toBeGreaterThan(0);
  });

  it("does not label established_static without evidence", () => {
    const lead = stubLead({ rating: 4.9, reviewCount: 400, metadata: {} });
    expect(classifyOutreachArchetype(lead)).toBe("general");
    lead.metadata = {
      [SCORING_EVIDENCE_METADATA_KEY]: buildLeadScoringEvidence({
        lead,
        market: { medianRating: 4.8, medianReviewCount: 200, ratingSampleSize: 2, reviewSampleSize: 2 },
        specialty: "general",
        compareReviewVolume: true,
        daysSinceLastReview: 10,
        reviewRecencyEnabled: true,
        reviewRecencyConfirmed: true,
        websiteAudit: null,
      }),
    };
    expect(classifyOutreachArchetype(lead)).toBe("general");
  });

  it("uses established_static when stale reviews on mature profile", () => {
    const lead = stubLead({ rating: 4.9, reviewCount: 400, metadata: {} });
    lead.metadata = {
      [SCORING_EVIDENCE_METADATA_KEY]: buildLeadScoringEvidence({
        lead,
        market: { medianRating: 4.8, medianReviewCount: 200, ratingSampleSize: 2, reviewSampleSize: 2 },
        specialty: "general",
        compareReviewVolume: true,
        daysSinceLastReview: 100,
        reviewRecencyEnabled: true,
        reviewRecencyConfirmed: true,
        websiteAudit: null,
      }),
    };
    expect(classifyOutreachArchetype(lead)).toBe("established_static");
  });

  it("does not flag stale reviews when recency order is unconfirmed", () => {
    const evidence = buildLeadScoringEvidence({
      lead: stubLead({ rating: 4.9, reviewCount: 400 }),
      market: { medianRating: 4.8, medianReviewCount: 200, ratingSampleSize: 2, reviewSampleSize: 2 },
      specialty: "general",
      compareReviewVolume: true,
      daysSinceLastReview: 120,
      reviewRecencyEnabled: true,
      reviewRecencyConfirmed: false,
      websiteAudit: null,
    });
    expect(evidence.noReviewIn90Days).toBe(false);
    expect(evidence.gaps.some((g) => g.includes("90 days"))).toBe(false);
  });
});
