import { describe, expect, it } from "vitest";
import { buildAdminSampleEmailReason } from "@/lib/admin-sample-email-copy";
import { buildDistinctAdminSampleEmailReasons } from "@/lib/admin-sample-email-copy";
import {
  formatAdminSampleEmailBullets,
  normalizeAdminSampleCopyReason,
} from "@/lib/admin-sample-format";
import type { Lead } from "@/lib/types";
import { EMPTY_LEAD_ENRICHMENT } from "@/lib/types";

function lead(partial: Partial<Lead> & Pick<Lead, "name">): Lead {
  return {
    placeId: "p1",
    niche: "dentists",
    address: null,
    website: partial.website ?? null,
    phone: null,
    rating: partial.rating ?? null,
    reviewCount: partial.reviewCount ?? null,
    primaryType: "dentist",
    mapsUrl: null,
    metadata: {},
    status: "new",
    opportunityType: partial.opportunityType ?? null,
    ...EMPTY_LEAD_ENRICHMENT,
    ...partial,
  };
}

describe("formatAdminSampleEmailBullets", () => {
  it("formats complete lines under 25 words with real numbers, no priority labels", () => {
    const leads = [
      {
        name: "Laguna Dental and Orthodontics",
        score: 58,
        tier: "high",
        whyThisLead: "ignored",
        bestContactMethod: "Email",
        pitchAngle: "ignored",
        opportunityType: "no website",
        address: null,
        emailCopyReason: buildAdminSampleEmailReason(
          lead({ name: "Laguna Dental and Orthodontics", website: null, opportunityType: "no_website" })
        ),
      },
      {
        name: "Gap Smiles",
        score: 52,
        tier: "medium",
        whyThisLead: "ignored",
        bestContactMethod: "Form",
        pitchAngle: "ignored",
        opportunityType: "reputation gap",
        address: null,
        emailCopyReason: buildAdminSampleEmailReason(
          lead({
            name: "Gap Smiles",
            website: "https://gap.example.com",
            rating: 4.1,
            reviewCount: 88,
            opportunityType: "reputation_gap",
          }),
          1
        ),
      },
    ];
    const text = formatAdminSampleEmailBullets(leads, 3, "Austin, TX");
    expect(text).toContain(
      "• Laguna Dental and Orthodontics: No website on the Google listing, so patients searching online have nowhere to land"
    );
    expect(text).toContain("88");
    expect(text.toLowerCase()).not.toContain("priority");
    for (const line of text.split("\n")) {
      expect(line.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(25);
    }
  });

  it("rewrites market gaps for paste copy", () => {
    const raw =
      "google rating is 4.2 stars vs. a 4.9 local median among practices in this run";
    expect(normalizeAdminSampleCopyReason(raw, "Austin, TX")).toBe(
      "google rating is 4.2 stars vs. a 4.9 average for Austin practices"
    );
  });

  it("varies reason wording across leads", () => {
    const batch = [
      lead({ name: "A", website: null, opportunityType: "no_website" }),
      lead({ name: "B", website: null, opportunityType: "no_website" }),
      lead({ name: "C", website: null, opportunityType: "no_website" }),
    ];
    const reasons = buildDistinctAdminSampleEmailReasons(batch);
    expect(new Set(reasons).size).toBe(3);
  });
});
