import { describe, expect, it } from "vitest";
import {
  applyColocatedPracticeWebsites,
  filterNonPracticeLeadQuality,
  isExcludedCommunityClinic,
  looksLikeEntityRegistrationName,
  looksLikeIndividualProviderName,
  MIN_REVIEWS_FOR_RATING_SIGNALS,
  prepareLeadsForScoring,
} from "@/lib/lead-quality-filters";
import { classifyOutreachArchetype } from "@/lib/marcus-outreach";
import { classifyOpportunityType, computeBaseScore } from "@/lib/dentist-scoring";
import type { Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

function lead(partial: Partial<Lead> & Pick<Lead, "name">): Lead {
  return {
    placeId: partial.placeId ?? "pid-" + partial.name.replace(/\s/g, "-"),
    niche: "dentists",
    address: partial.address ?? null,
    website: partial.website ?? null,
    phone: partial.phone ?? "5125550100",
    rating: partial.rating ?? null,
    reviewCount: partial.reviewCount ?? null,
    primaryType: partial.primaryType ?? "dentist",
    mapsUrl: null,
    metadata: {},
    status: "new",
    ...EMPTY_LEAD_ENRICHMENT,
    ...partial,
  };
}

describe("lead-quality-filters", () => {
  it("excludes community and university clinic names", () => {
    expect(isExcludedCommunityClinic(lead({ name: "Austin Community Dental Clinic" }))).toBe(true);
    expect(isExcludedCommunityClinic(lead({ name: "UT School of Dentistry" }))).toBe(true);
    expect(isExcludedCommunityClinic(lead({ name: "UCLA School of Dentistry" }))).toBe(true);
    expect(isExcludedCommunityClinic(lead({ name: "USC Herman Ostrow School of Dentistry" }))).toBe(true);
    expect(isExcludedCommunityClinic(lead({ name: "UCLA Dental Clinics" }))).toBe(true);
    expect(isExcludedCommunityClinic(lead({ name: "Smile Family Dental" }))).toBe(false);
  });

  it("detects entity-style registration names", () => {
    expect(looksLikeEntityRegistrationName("DENTALCLINICUSLLC")).toBe(true);
    expect(looksLikeEntityRegistrationName("FooBarPLLC")).toBe(true);
    expect(looksLikeEntityRegistrationName("Forest Family Dental PLLC")).toBe(false);
  });

  it("detects individual provider names", () => {
    expect(looksLikeIndividualProviderName("Jane Doe, DDS")).toBe(true);
    expect(looksLikeIndividualProviderName("Dr. John Smith")).toBe(true);
    expect(looksLikeIndividualProviderName("Perspective Dental: Ashley Smitherman, DDS")).toBe(true);
    expect(looksLikeIndividualProviderName("Forest Family Dental")).toBe(false);
  });

  it("drops provider listing when a practice shares the address", () => {
    const addr = "100 Main St, Austin, TX 78701";
    const rows = [
      lead({ name: "Main Street Dental", address: addr, website: "https://main.example.com" }),
      lead({ name: "Jane Doe, DDS", address: addr, website: null }),
    ];
    const out = filterNonPracticeLeadQuality(rows);
    expect(out.map((l) => l.name)).toEqual(["Main Street Dental"]);
  });

  it("inherits practice website for co-located listings without one", () => {
    const addr = "100 Main St, Austin, TX 78701";
    const rows = [
      lead({ name: "Main Street Dental", address: addr, website: "https://main.example.com" }),
      lead({ name: "Main Street Dental Hygiene", address: addr, website: null }),
    ];
    const out = applyColocatedPracticeWebsites(rows);
    const hygiene = out.find((l) => l.name.includes("Hygiene"));
    expect(hygiene?.website).toBe("https://main.example.com");
    expect(classifyOpportunityType(hygiene!)).not.toBe("no_website");
  });

  it(`requires ${MIN_REVIEWS_FOR_RATING_SIGNALS}+ reviews for reputation gap archetype`, () => {
    const thin = lead({ name: "Thin Reviews Dental", website: "https://a.com", rating: 4.1, reviewCount: 8 });
    const solid = lead({ name: "Solid Reviews Dental", website: "https://b.com", rating: 4.1, reviewCount: 40 });
    expect(classifyOutreachArchetype(thin)).not.toBe("reputation_gap");
    expect(classifyOutreachArchetype(solid)).toBe("reputation_gap");
    expect(classifyOpportunityType(thin)).not.toBe("reputation_gap");
    expect(computeBaseScore(thin)).toBeLessThan(computeBaseScore(solid));
  });

  it("prepareLeadsForScoring combines website inherit and filters", () => {
    const addr = "200 Oak St, Dallas, TX 75201";
    const rows = [
      lead({ name: "Oak Dental Care", address: addr, website: "https://oak.example.com" }),
      lead({ name: "Sam Lee, DMD", address: addr, website: null }),
      lead({ name: "Free Clinic Ministries Dental", address: "9 Other St", website: null }),
    ];
    const out = prepareLeadsForScoring(rows);
    expect(out.map((l) => l.name)).toEqual(["Oak Dental Care"]);
  });
});
