import { describe, expect, it } from "vitest";
import {
  computeAdminSampleExcludedPlaceIds,
  filterLeadsForAdminSample,
  isGenericKeywordPracticeName,
} from "@/lib/admin-sample-eligibility";
import type { Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

function lead(partial: Partial<Lead> & Pick<Lead, "name">): Lead {
  return {
    placeId: partial.placeId ?? "p-" + partial.name.replace(/\W/g, ""),
    niche: "dentists",
    address: partial.address ?? "1 Main St, Austin, TX",
    website: partial.website ?? null,
    phone: "5125550100",
    rating: 4.2,
    reviewCount: 40,
    primaryType: "dentist",
    mapsUrl: null,
    metadata: {},
    status: "new",
    score: 70,
    ...EMPTY_LEAD_ENRICHMENT,
    ...partial,
  };
}

describe("admin-sample-eligibility", () => {
  it("flags generic keyword listing names", () => {
    expect(isGenericKeywordPracticeName("Dentist in Austin", "Austin")).toBe(true);
    expect(isGenericKeywordPracticeName("Austin Dentist", "Austin")).toBe(true);
    expect(isGenericKeywordPracticeName("Emergency Dentist Austin", "Austin")).toBe(true);
    expect(isGenericKeywordPracticeName("Forest Family Dental", "Austin")).toBe(false);
  });

  it("excludes shared-domain and brand-variant groups", () => {
    const rows = [
      lead({
        placeId: "a1",
        name: "Access Dental",
        website: "https://www.accessdental.com",
        address: "1 A St, Austin, TX",
      }),
      lead({
        placeId: "a2",
        name: "Access Dental & Orthodontics",
        website: "https://www.accessdental.com",
        address: "2 B St, Austin, TX",
      }),
      lead({
        placeId: "s1",
        name: "Solo Oak Dental",
        website: "https://solo-oak.example.com",
        address: "3 C St, Austin, TX",
      }),
    ];
    const excluded = computeAdminSampleExcludedPlaceIds(rows, "Austin");
    expect(excluded.has("a1")).toBe(true);
    expect(excluded.has("a2")).toBe(true);
    expect(excluded.has("s1")).toBe(false);
    expect(filterLeadsForAdminSample(rows, "Austin").map((l) => l.placeId)).toEqual(["s1"]);
  });

  it("excludes location-suffixed chain-style names", () => {
    const rows = [
      lead({ placeId: "c1", name: "Dental Republic - Riverside", website: "https://dr.example.com" }),
    ];
    expect(computeAdminSampleExcludedPlaceIds(rows, "Austin").has("c1")).toBe(true);
  });
});
