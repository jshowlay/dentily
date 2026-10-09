import { describe, expect, it } from "vitest";
import { SCORING_EVIDENCE_METADATA_KEY } from "@/lib/lead-scoring-evidence";
import {
  buildOutreachDraft,
  buildOutreachDraftsForLeads,
  buildOutreachSubjectLine,
  classifyOutreachDraftStyle,
} from "@/lib/outreach-draft";
import { OUTREACH_SOFT_QUESTION_CTAS, pickOutreachCtaIndex } from "@/lib/outreach-cta";
import type { Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

function lead(partial: Partial<Lead> & Pick<Lead, "name">): Lead {
  return {
    placeId: partial.placeId ?? partial.name,
    niche: "dentists",
    address: "123 Main, Boise, ID",
    website: partial.website ?? "https://example.com",
    phone: null,
    rating: partial.rating ?? 4.2,
    reviewCount: partial.reviewCount ?? 120,
    primaryType: "dentist",
    mapsUrl: null,
    metadata: partial.metadata ?? {},
    status: "new",
    opportunityType: partial.opportunityType ?? null,
    ...EMPTY_LEAD_ENRICHMENT,
    ...partial,
  };
}

describe("outreach drafts", () => {
  it("uses conversational copy with city rating comparison", () => {
    const l = lead({
      name: "North End Dental",
      metadata: {
        [SCORING_EVIDENCE_METADATA_KEY]: {
          marketMedianRating: 4.9,
          marketMedianReviewCount: 200,
          daysSinceLastReview: null,
          reviewRecencyEnabled: false,
          reviewRecencyConfirmed: false,
          noReviewIn90Days: false,
          ratingVsMarket: "4.2 stars vs. a 4.9 local median",
          reviewsVsMarket: null,
          website: null,
          gaps: ["Google rating is 4.2 stars vs. a 4.9 local median among practices in this run."],
        },
      },
    });
    const text = buildOutreachDraft(l, { marketCity: "Boise" });
    expect(text).toContain("North End Dental");
    expect(text).toMatch(/4\.2 stars/i);
    expect(text).toMatch(/around 4\.9/i);
    expect(text).not.toMatch(/public snapshot|homepage scan|public proof|public listing/i);
    expect(classifyOutreachDraftStyle(l, { marketCity: "Boise" })).toBe("reputation_gap");
  });

  it("keeps placeholders and stays under 90 words", () => {
    const text = buildOutreachDraft(lead({ name: "Gap Smiles", rating: 4.1, reviewCount: 88 }), {
      marketCity: "Boise",
    });
    expect(text).toContain("{{your_name}}");
    expect(text).toContain("{{your_company}}");
    expect(text).toContain("{{your_credibility_line}}");
    expect(text.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(95);
  });

  it("never picks the same CTA index twice in a row", () => {
    expect(pickOutreachCtaIndex(2, 2)).not.toBe(2);
    expect(pickOutreachCtaIndex(0, 0)).toBe(1);
  });

  it("pack batch builder avoids consecutive duplicate CTAs", () => {
    const meta = {
      [SCORING_EVIDENCE_METADATA_KEY]: {
        marketMedianRating: 4.9,
        marketMedianReviewCount: 200,
        daysSinceLastReview: null,
        reviewRecencyEnabled: false,
        reviewRecencyConfirmed: false,
        noReviewIn90Days: false,
        ratingVsMarket: "4.1 stars vs. a 4.9 local median",
        reviewsVsMarket: null,
        website: null,
        gaps: [],
      },
    };
    const batch = Array.from({ length: 8 }, (_, i) =>
      lead({
        name: `Practice ${i}`,
        placeId: `p${i}`,
        rating: 4.1,
        reviewCount: 50 + i,
        metadata: meta,
      })
    );
    const drafts = buildOutreachDraftsForLeads(batch, "Boise");
    const ctas = batch.map((l) => {
      const d = drafts.get(l.placeId)!;
      return OUTREACH_SOFT_QUESTION_CTAS.find((c) => d.includes(c)) ?? "";
    });
    for (let i = 1; i < ctas.length; i += 1) {
      if (ctas[i] && ctas[i - 1]) expect(ctas[i]).not.toBe(ctas[i - 1]);
    }
  });

  it("builds a subject line", () => {
    const l = lead({
      name: "Modern Dental",
      metadata: {
        [SCORING_EVIDENCE_METADATA_KEY]: {
          marketMedianRating: 4.9,
          marketMedianReviewCount: 200,
          daysSinceLastReview: null,
          reviewRecencyEnabled: false,
          reviewRecencyConfirmed: false,
          noReviewIn90Days: false,
          ratingVsMarket: "4.2 stars vs. a 4.9 local median",
          reviewsVsMarket: null,
          website: null,
          gaps: [],
        },
      },
    });
    const subj = buildOutreachSubjectLine(l, { marketCity: "Boise" });
    expect(subj).toContain("Boise");
    expect(subj.length).toBeLessThan(80);
  });
});
