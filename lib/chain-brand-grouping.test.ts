import { describe, expect, it } from "vitest";
import {
  buildSharedChainBrandPlaceIds,
  isDistinctiveChainBrandKey,
  qualifyChainBrandGroup,
} from "@/lib/chain-brand-grouping";
import type { Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

function lead(p: Partial<Lead> & Pick<Lead, "placeId" | "name">): Lead {
  return {
    niche: "dentists",
    address: null,
    website: null,
    ...EMPTY_LEAD_ENRICHMENT,
    ...p,
  };
}

describe("chain brand grouping", () => {
  it("requires distinctive tokens for generic-only brand keys", () => {
    expect(isDistinctiveChainBrandKey("dental center")).toBe(false);
    expect(isDistinctiveChainBrandKey("west coast dental")).toBe(true);
  });

  it("does not chain generic 'Dental Center of …' names without shared domain or phone", () => {
    const members = [
      lead({ placeId: "a", name: "Dental Center of Highland Park", website: "https://a.com/" }),
      lead({ placeId: "b", name: "Dental Center of Echo Park", website: "https://b.com/" }),
    ];
    expect(qualifyChainBrandGroup("dental center", members)).toBeNull();
    expect(buildSharedChainBrandPlaceIds(members).size).toBe(0);
  });

  it("chains West Coast Dental of … via distinctive prefix", () => {
    const members = [
      lead({
        placeId: "wc1",
        name: "West Coast Dental of Los Angeles",
        website: "https://www.westcoastdental.com/",
      }),
      lead({
        placeId: "wc2",
        name: "West Coast Dental of 6th Street",
        website: "https://www.westcoastdental.com/",
      }),
    ];
    expect(buildSharedChainBrandPlaceIds(members).size).toBe(2);
  });
});
