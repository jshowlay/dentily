import { describe, expect, it } from "vitest";
import { classifyDentalSpecialty } from "@/lib/dental-specialty";
import {
  computeMarketBenchmarksBySpecialty,
  marketContextForLead,
} from "@/lib/market-benchmarks";
import type { Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

function stub(partial: Partial<Lead>): Lead {
  return {
    placeId: "p1",
    name: "Test",
    address: null,
    website: null,
    phone: null,
    rating: 4.5,
    reviewCount: 100,
    primaryType: "dentist",
    mapsUrl: null,
    metadata: {},
    ...EMPTY_LEAD_ENRICHMENT,
    ...partial,
  };
}

describe("classifyDentalSpecialty", () => {
  it("detects orthodontist", () => {
    expect(classifyDentalSpecialty(stub({ name: "Hanan Orthodontics", primaryType: "dentist" }))).toBe(
      "orthodontist"
    );
  });
});

describe("marketContextForLead", () => {
  it("skips review volume compare when lone specialist in batch", () => {
    const leads = [
      stub({ placeId: "g1", name: "General Family Dental", reviewCount: 400 }),
      stub({ placeId: "o1", name: "Solo Orthodontics", primaryType: "orthodontist", reviewCount: 50 }),
    ];
    const bySpec = computeMarketBenchmarksBySpecialty(leads);
    const fallback = bySpec.get("general")!;
    const ctx = marketContextForLead(leads[1]!, bySpec, fallback);
    expect(ctx.specialty).toBe("orthodontist");
    expect(ctx.compareReviewVolume).toBe(false);
  });
});
