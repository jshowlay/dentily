import { describe, expect, it } from "vitest";
import {
  canViewFullLeadPackOnResults,
  prepareLeadsForResultsClient,
  redactLeadsForPublicPreview,
} from "@/lib/results-lead-preview";
import type { Lead } from "@/lib/types";

const sampleLead: Lead = {
  placeId: "p1",
  name: "Test Dental",
  primaryEmail: "info@test.com",
  phone: "555-0100",
  contactFormUrl: "https://test.com/contact",
  website: "https://test.com",
  outreach: "Hello " + "x".repeat(300),
};

describe("results lead preview", () => {
  it("redacts contact fields and truncates outreach", () => {
    const [row] = redactLeadsForPublicPreview([sampleLead]);
    expect(row.primaryEmail).toBeNull();
    expect(row.phone).toBeNull();
    expect(row.contactFormUrl).toBeNull();
    expect(row.website).toBeNull();
    expect(row.outreach?.endsWith("…")).toBe(true);
    expect(row.outreach!.length).toBeLessThan(sampleLead.outreach!.length);
  });

  it("requires payment and buyer proof for full detail", () => {
    expect(canViewFullLeadPackOnResults(false, { allowed: false, message: "n" })).toBe(false);
    expect(canViewFullLeadPackOnResults(false, { allowed: true, via: "session" })).toBe(false);
    expect(canViewFullLeadPackOnResults(true, { allowed: false, message: "n" })).toBe(false);
    expect(
      canViewFullLeadPackOnResults(true, { allowed: true, via: "session" })
    ).toBe(true);
    expect(
      canViewFullLeadPackOnResults(true, { allowed: true, via: "admin" })
    ).toBe(true);
    expect(
      canViewFullLeadPackOnResults(false, { allowed: true, via: "admin" })
    ).toBe(false);
  });

  it("precomputes signals from full lead before redaction", () => {
    const full: Lead = {
      ...sampleLead,
      opportunityType: "no_online_booking",
      metadata: {
        scoringEvidence: {
          website: { hasOnlineBooking: false },
          gaps: [],
        },
      },
    };
    const { leads, signalTypeCount } = prepareLeadsForResultsClient([full], false);
    expect(leads[0]?.website).toBeNull();
    expect(leads[0]?.displaySignal?.label).toBe("No online booking");
    expect(signalTypeCount).toBe(1);
  });
});
