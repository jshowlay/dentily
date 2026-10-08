import { describe, expect, it } from "vitest";
import {
  PACK_LISTING_LABELS,
  buildPackListingContext,
  resolvePackListingLabel,
  sortLeadsForPaidPack,
} from "@/lib/pack-listing-quality";
import { SCORING_EVIDENCE_METADATA_KEY } from "@/lib/lead-scoring-evidence";
import { PACK_LISTING_LABEL_METADATA_KEY } from "@/lib/pack-listing-quality";
import type { Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

function lead(p: Partial<Lead> & Pick<Lead, "placeId" | "name">): Lead {
  return {
    niche: "dentists",
    address: null,
    website: null,
    ...EMPTY_LEAD_ENRICHMENT,
    score: 70,
    priority: "high",
    ...p,
  };
}

describe("pack listing quality", () => {
  it("labels provider and generic listings", () => {
    const ctx = buildPackListingContext([], "Austin");
    expect(
      resolvePackListingLabel(lead({ placeId: "p1", name: "Horne Ronald D DDS" }), ctx)
    ).toBe(PACK_LISTING_LABELS.provider);
    expect(
      resolvePackListingLabel(lead({ placeId: "p2", name: "Dentist in Austin" }), ctx)
    ).toBe(PACK_LISTING_LABELS.generic);
  });

  it("sorts independents with evidence gaps before labeled rows", () => {
    const rows = [
      lead({
        placeId: "chain",
        name: "Bright Now Dental - Austin",
        score: 73,
        metadata: {
          [PACK_LISTING_LABEL_METADATA_KEY]: PACK_LISTING_LABELS.chain,
          [SCORING_EVIDENCE_METADATA_KEY]: { gaps: ["x"], reviewRecencyEnabled: true, reviewRecencyConfirmed: true, noReviewIn90Days: false, marketMedianRating: null, marketMedianReviewCount: null, daysSinceLastReview: null, ratingVsMarket: null, reviewsVsMarket: null, website: null },
        },
      }),
      lead({
        placeId: "ind-gap",
        name: "Forest Family Dental",
        score: 60,
        metadata: { [SCORING_EVIDENCE_METADATA_KEY]: { gaps: ["Review gap"], reviewRecencyEnabled: true, reviewRecencyConfirmed: true, noReviewIn90Days: true, marketMedianRating: 4.9, marketMedianReviewCount: 100, daysSinceLastReview: 120, ratingVsMarket: null, reviewsVsMarket: null, website: null } },
      }),
      lead({
        placeId: "ind-plain",
        name: "Treaty Oak Dental",
        score: 80,
        metadata: { [SCORING_EVIDENCE_METADATA_KEY]: { gaps: [], reviewRecencyEnabled: true, reviewRecencyConfirmed: true, noReviewIn90Days: false, marketMedianRating: null, marketMedianReviewCount: null, daysSinceLastReview: null, ratingVsMarket: null, reviewsVsMarket: null, website: null } },
      }),
    ];
    const sorted = sortLeadsForPaidPack(rows);
    expect(sorted[0]?.placeId).toBe("ind-gap");
    expect(sorted.map((l) => l.placeId).slice(-1)[0]).toBe("chain");
  });
});
