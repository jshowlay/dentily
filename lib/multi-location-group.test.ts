import { describe, expect, it } from "vitest";
import {
  applyMultiLocationGroupRankAdjustments,
  hasExplicitLocationSuffix,
  isIndependentPracticeLead,
  isMultiLocationGroupLead,
  MULTI_LOCATION_GROUP_LABEL,
  normalizeBrandKey,
} from "@/lib/multi-location-group";
import type { Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

function lead(partial: Partial<Lead> & Pick<Lead, "name">): Lead {
  return {
    placeId: "p-" + partial.name.replace(/\W/g, ""),
    niche: "dentists",
    address: partial.address ?? null,
    website: partial.website ?? "https://example.com",
    phone: "5125550100",
    rating: partial.rating ?? 4.2,
    reviewCount: partial.reviewCount ?? 40,
    primaryType: "dentist",
    mapsUrl: null,
    metadata: partial.metadata ?? {},
    status: "new",
    score: partial.score ?? 70,
    priority: partial.priority ?? "high",
    ...EMPTY_LEAD_ENRICHMENT,
    ...partial,
  };
}

describe("multi-location-group", () => {
  it("detects location suffix in name", () => {
    expect(hasExplicitLocationSuffix("Aspen Dental - Riverside")).toBe(true);
    expect(normalizeBrandKey("Aspen Dental - Riverside")).toBe(normalizeBrandKey("Aspen Dental"));
  });

  it("flags same brand at two addresses", () => {
    const rows = [
      lead({ name: "Bright Smiles Dental", address: "1 A St, Austin, TX", score: 72 }),
      lead({ name: "Bright Smiles Dental", address: "2 B St, Austin, TX", score: 71 }),
      lead({ name: "Solo Family Dental", address: "3 C St, Austin, TX", score: 65 }),
    ];
    const out = applyMultiLocationGroupRankAdjustments(rows);
    const bright = out.find((l) => l.name.startsWith("Bright"))!;
    const solo = out.find((l) => l.name.startsWith("Solo"))!;
    expect(isMultiLocationGroupLead(bright)).toBe(true);
    expect(isIndependentPracticeLead(solo)).toBe(true);
    expect(out.indexOf(solo)).toBeLessThan(out.indexOf(bright));
    expect(bright.metadata?.multiLocationGroup).toBe(true);
  });

  it("labels multi-location tier string for admin display", () => {
    expect(MULTI_LOCATION_GROUP_LABEL).toBe("Multi-location group");
  });
});
