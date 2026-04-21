import { describe, expect, it } from "vitest";
import { buildLeadPackCsv, buildLeadPackRowsFromExport } from "@/lib/lead-pack-export";
import { AUSTIN_PIPELINE_SAMPLE_EXPORT } from "@/lib/lead-pipeline-fixtures";
import { buildMarcusWrittenOutreach } from "@/lib/marcus-outreach";
import { exportRowToLead } from "@/lib/export-lead-adapter";
import { parseCityFromAddress } from "@/lib/parse-city-from-address";
import type { ExportLeadRow } from "@/lib/types";

const FORBIDDEN_CLAIM_PHRASES = [
  "reads like a template catalog",
  "almost no visible brand-defense paid search",
] as const;

const PERSONA_STRINGS = ["Marcus", "Ellery", "Dallas DSO", "paid acquisition for a"] as const;

const ZIP_CITY_REF = /[Ii]n [A-Z]{2} \d{5}/;

/** Major metros: outreach must not say "In {metro}" unless it matches the parsed practice city. */
const MAJOR_METROS = [
  "Austin",
  "Los Angeles",
  "San Francisco",
  "San Diego",
  "Seattle",
  "Denver",
  "Phoenix",
  "Dallas",
  "Houston",
  "Chicago",
  "Miami",
  "Atlanta",
  "Boston",
  "New York",
  "Philadelphia",
  "Detroit",
  "Minneapolis",
  "Portland",
  "Las Vegas",
  "Nashville",
] as const;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertBuyerOutreachDraft(outreach: string): void {
  expect(outreach.includes("{{your_name}}")).toBe(true);
  expect(outreach.includes("{{your_company}}")).toBe(true);
  expect(outreach.includes("{{your_credibility_line}}")).toBe(true);
  for (const s of PERSONA_STRINGS) {
    expect(outreach.includes(s), `Forbidden persona string ${JSON.stringify(s)}`).toBe(false);
  }
  expect(ZIP_CITY_REF.test(outreach), `ZIP-style city reference in: ${outreach}`).toBe(false);
}

function assertCityPhrasingMatchesAddress(outreach: string, address: string | null): void {
  const city = parseCityFromAddress(address);
  for (const metro of MAJOR_METROS) {
    const re = new RegExp(`\\bIn ${escapeRe(metro)} that\\b`, "i");
    if (!re.test(outreach)) continue;
    expect(
      city && metro.toLowerCase() === city.toLowerCase(),
      `Outreach uses “In ${metro} that” but parsed city was ${JSON.stringify(city)}`
    ).toBe(true);
  }
}

function assertNoUnsupportedClaims(outreach: string): void {
  for (const p of FORBIDDEN_CLAIM_PHRASES) {
    expect(outreach.toLowerCase().includes(p), `Unsupported claim phrase: ${p}`).toBe(false);
  }
}

function exportRow(p: Partial<ExportLeadRow> & Pick<ExportLeadRow, "name" | "address">): ExportLeadRow {
  return {
    name: p.name,
    address: p.address ?? null,
    website: p.website ?? null,
    phone: p.phone ?? null,
    primary_email: p.primary_email ?? null,
    contact_form_url: p.contact_form_url ?? null,
    email_status: p.email_status ?? "pending",
    email_source: p.email_source ?? null,
    enrichment_notes: p.enrichment_notes ?? null,
    email_rejection_reason: p.email_rejection_reason ?? null,
    contactable: Boolean(p.primary_email || p.contact_form_url || p.phone),
    outreach_readiness: p.outreach_readiness ?? "medium",
    rating: p.rating ?? null,
    review_count: p.review_count ?? null,
    score: p.score ?? 50,
    reason: p.reason ?? null,
    outreach: p.outreach ?? null,
    priority: p.priority ?? "medium",
    opportunity_type: p.opportunity_type ?? null,
    primary_type: p.primary_type ?? "dentist",
    maps_url: p.maps_url ?? null,
    created_at: p.created_at ?? null,
  };
}

describe("shipping blockers (outreach + export gates)", () => {
  it("buyer outreach drafts use placeholders and never ship Marcus-era persona copy", () => {
    const seeds: ExportLeadRow[] = [];
    for (let i = 0; i < 80; i += 1) {
      seeds.push(
        exportRow({
          name: `Practice Archetype Sweep ${i}`,
          address: `${100 + i} Main St, Los Angeles, CA 90001`,
          website: "https://example.com/",
          rating: i % 5 === 0 ? 3.4 : 4.8,
          review_count: i % 5 === 0 ? 40 : 300 + (i % 50),
        })
      );
    }
    const legacyReplyPatterns = [
      /\bReply\s+audit\b/i,
      /\bReply\s+clip\b/i,
      /\bReply\s+walkthrough\b/i,
      /\bReply\s+map\b/i,
      /\bReply\s+visibility\b/i,
      /\bReply\s+hiring\b/i,
      /\bReply\s+referrals\b/i,
    ];
    for (const r of seeds) {
      const text = buildMarcusWrittenOutreach(exportRowToLead(r, 0));
      assertBuyerOutreachDraft(text);
      assertCityPhrasingMatchesAddress(text, r.address);
      assertNoUnsupportedClaims(text);
      for (const re of legacyReplyPatterns) {
        expect(re.test(text), `Unexpected legacy CTA in: ${text}`).toBe(false);
      }
    }
  });

  it("Los Angeles reputation-gap rows never borrow another metro in the opener", () => {
    const r = exportRow({
      name: "Low Stars LA Test",
      address: "500 Broadway, Los Angeles, CA 90013",
      website: "https://la-dental.example/",
      rating: 3.2,
      review_count: 22,
    });
    const text = buildMarcusWrittenOutreach(exportRowToLead(r, 0));
    assertCityPhrasingMatchesAddress(text, r.address);
    expect(text.toLowerCase()).not.toMatch(/\bin austin that\b/);
  });

  it("export gate blanks garbage primary email and records rejection", () => {
    const pack = buildLeadPackRowsFromExport([
      exportRow({
        name: "Bad Inbox",
        address: "1 Main St, Austin, TX",
        primary_email: "rspack@1.6.6",
        contact_form_url: "https://bad.example/contact",
        phone: "512-555-0100",
      }),
    ]);
    const bad = pack.find((r) => r.name === "Bad Inbox");
    expect(bad?.primary_email).toBe("");
    expect(bad?.email_rejection_reason).toMatch(/csv_export_gate:/);
    expect(bad?.best_contact_method).toBe("Contact Form");
  });

  it("Austin sample export pack matches the same greps as the regenerated CSV", () => {
    const pack = buildLeadPackRowsFromExport(AUSTIN_PIPELINE_SAMPLE_EXPORT);
    const csv = buildLeadPackCsv(pack);
    const blob = `${csv}\n${pack.map((r) => `${r.primary_email}\t${r.outreach_draft}`).join("\n")}`;
    const forbidden = [
      " His ",
      " He spent ",
      "reads like a template catalog",
      "brand-defense paid search",
      "rspack@",
      "@1.6.6",
      "Reply audit",
      "Reply clip",
      "Marcus",
      "Ellery",
    ] as const;
    for (const needle of forbidden) {
      expect(blob.includes(needle), `Pack contained forbidden ${JSON.stringify(needle)}`).toBe(false);
    }
  });
});
