import { describe, expect, it } from "vitest";
import { computeQuickStartPackStatsFromCsvRows } from "@/lib/pdf/quick-start-pack-stats";
import type { LeadPackCsvRow } from "@/lib/lead-pack-export";

function row(partial: Partial<LeadPackCsvRow> & Pick<LeadPackCsvRow, "name">): LeadPackCsvRow {
  return {
    name: partial.name,
    listing_label: "",
    priority: partial.priority ?? "medium",
    action_tier: "",
    why_this_lead: "",
    address: "",
    other_locations: "",
    website: "",
    phone: "",
    primary_email: partial.primary_email ?? "",
    other_emails: "",
    contact_form_url: partial.contact_form_url ?? "",
    best_contact_method: partial.best_contact_method ?? "None",
    reachability_score: "0",
    contactable: partial.contactable ?? "No",
    cluster_notes: "",
    voicemail_script: "",
    email_status: "",
    email_source: "",
    enrichment_notes: "",
    email_rejection_reason: "",
    outreach_readiness: "",
    estimated_opportunity: "",
    rating: "",
    review_count: "",
    score: "",
    opportunity_type: "",
    ownership: "",
    why_now: "",
    reason: "",
    outreach_draft: "",
    maps_url: "https://maps.google.com/?cid=1",
    top_lead: "No",
    placeholders_remaining: "",
    apollo_enrichment: "",
  };
}

describe("computeQuickStartPackStatsFromCsvRows", () => {
  it("counts contact methods from best_contact_method", () => {
    const stats = computeQuickStartPackStatsFromCsvRows([
      row({ name: "A", best_contact_method: "Email", contactable: "Yes", priority: "High" }),
      row({ name: "B", best_contact_method: "Contact Form", contactable: "Yes" }),
      row({ name: "C", best_contact_method: "Phone (no digital path)", contactable: "Gatekeeper only" }),
    ]);
    expect(stats.totalPractices).toBe(3);
    expect(stats.emailCount).toBe(1);
    expect(stats.formCount).toBe(1);
    expect(stats.phoneCount).toBe(1);
    expect(stats.topPriorityLeads).toBe(1);
  });
});
