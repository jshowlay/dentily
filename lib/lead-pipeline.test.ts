import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { computeBaseScore, classifyPriorityFromScore } from "@/lib/dentist-scoring";
import { exportRowToLead } from "@/lib/export-lead-adapter";
import { buildMarcusWrittenOutreach, classifyOutreachArchetype } from "@/lib/marcus-outreach";
import { MARCUS_OUTREACH_CTA, MARCUS_OUTREACH_CTA_HIRING } from "@/lib/outreach-cta";
import { REVIEW_SATURATION } from "@/lib/lead-pipeline-config";
import {
  pickBestRowForPinnedPracticeName,
  type LeadPackCsvRow,
} from "@/lib/austin-homepage-sample";
import {
  ACTION_TIER_CALL,
  ACTION_TIER_READY,
  ACTION_TIER_RESEARCH,
  buildLeadPackCsv,
  buildLeadPackRowsFromExport,
  normalizeAddressKey,
} from "@/lib/lead-pack-export";
import {
  AUSTIN_PIPELINE_SAMPLE_EXPORT,
  FRONTIER_TRAIL_FIXTURE_ADDRESS,
  makeFixtureExportRow,
} from "@/lib/lead-pipeline-fixtures";
import { isLeadPackInstructionRow } from "@/lib/lead-pack-export";
import type { ExportLeadRow } from "@/lib/types";
import { hasDuplicateFiveWordSpan as hasDup5 } from "@/lib/outreach-text";

const SAMPLE_EXPORT = AUSTIN_PIPELINE_SAMPLE_EXPORT;

describe("lead pipeline", () => {
  it("does not produce duplicate 5-word spans in Marcus outreach", () => {
    for (const r of SAMPLE_EXPORT) {
      const lead = exportRowToLead(r, 0);
      const text = buildMarcusWrittenOutreach(lead);
      expect(hasDup5(text)).toBe(false);
    }
  });

  it("uses hiring CTA and direct offer copy for high volume saturation", () => {
    const lead = exportRowToLead(
      makeFixtureExportRow({
        name: "Saturated Practice",
        website: "https://saturated.example.com/",
        rating: 4.9,
        review_count: REVIEW_SATURATION,
      }),
      0
    );
    expect(classifyOutreachArchetype(lead)).toBe("high_volume_saturation");
    const text = buildMarcusWrittenOutreach(lead);
    expect(text).toContain(MARCUS_OUTREACH_CTA_HIRING);
    expect(text).not.toContain(MARCUS_OUTREACH_CTA);
    expect(text.toLowerCase()).not.toMatch(/skip the growth pitch|not a growth cold call|waste your time/);
  });

  it("prefers on-domain email location when a pinned name has multiple listings", () => {
    const pool = [
      {
        name: "Breeze Dental",
        address: "1601 S Lamar Blvd, Austin, TX 78704",
        website: "https://breeze.example.com/",
        primary_email: "",
        email_status: "Contact Form Only",
        score: "11",
        opportunity_type: "High Volume Saturation",
        review_count: "1000",
        rating: "4.8",
        contact_form_url: "https://breeze.example.com/contact",
        best_contact_method: "Contact Form",
        priority: "Low",
      },
      {
        name: "Breeze Dental",
        address: "3800 N Lamar Blvd Ste 130, Austin, TX 78756",
        website: "https://breeze.example.com/",
        primary_email: "hello@breezeoralcare.com",
        email_status: "Found",
        score: "54",
        opportunity_type: "General Growth",
        review_count: "172",
        rating: "4.9",
        contact_form_url: "",
        best_contact_method: "Email",
        priority: "Medium",
      },
    ] as LeadPackCsvRow[];
    const picked = pickBestRowForPinnedPracticeName(pool, "Breeze Dental");
    expect(picked?.address).toContain("3800 N Lamar");
  });

  it("is deterministic for the same lead input", () => {
    const r = SAMPLE_EXPORT[2]!;
    const lead = exportRowToLead(r, 0);
    const a = computeBaseScore(lead, { allNamesLower: SAMPLE_EXPORT.map((x) => (x.name ?? "").toLowerCase()) });
    const b = computeBaseScore(lead, { allNamesLower: SAMPLE_EXPORT.map((x) => (x.name ?? "").toLowerCase()) });
    expect(a).toBe(b);
  });

  it("normalizes Frontier Trail shared address to the same cluster key", () => {
    expect(normalizeAddressKey(FRONTIER_TRAIL_FIXTURE_ADDRESS)).toBe(
      normalizeAddressKey("4419 Frontier Trail Suite 104 Austin TX 78745")
    );
    expect(normalizeAddressKey(FRONTIER_TRAIL_FIXTURE_ADDRESS).length).toBeGreaterThan(10);
  });

  it("priority buckets align with configured score thresholds", () => {
    expect(classifyPriorityFromScore(70, true)).toBe("high");
    expect(classifyPriorityFromScore(70, false)).toBe("medium");
    expect(classifyPriorityFromScore(50)).toBe("medium");
    expect(classifyPriorityFromScore(30)).toBe("low");
  });

  it("demotes corporate and community labels below independents in export order", () => {
    const pack = buildLeadPackRowsFromExport([
      makeFixtureExportRow({
        name: "Small Smiles Dental Center",
        address: "1 A St, Boise, ID",
        website: "https://www.smallsmiles.com/",
        score: 100,
        priority: "high",
        maps_url: "https://maps.google.com/?cid=111",
        metadata: {
          scoringEvidence: {
            gaps: [],
            reviewRecencyEnabled: true,
            reviewRecencyConfirmed: true,
            noReviewIn90Days: false,
            marketMedianRating: null,
            marketMedianReviewCount: null,
            daysSinceLastReview: null,
            ratingVsMarket: null,
            reviewsVsMarket: null,
            website: null,
          },
        },
      }),
      makeFixtureExportRow({
        name: "Treaty Oak Dental",
        address: "2 B St, Boise, ID",
        score: 65,
        priority: "medium",
        maps_url: "https://maps.google.com/?cid=222",
        metadata: {
          scoringEvidence: {
            gaps: ["Review gap"],
            reviewRecencyEnabled: true,
            reviewRecencyConfirmed: true,
            noReviewIn90Days: true,
            marketMedianRating: 4.9,
            marketMedianReviewCount: 100,
            daysSinceLastReview: 120,
            ratingVsMarket: null,
            reviewsVsMarket: null,
            website: null,
          },
        },
      }),
    ]).filter((p) => !isLeadPackInstructionRow(p));
    expect(pack[0]?.name).toBe("Treaty Oak Dental");
    const chain = pack.find((p) => p.name.includes("Small Smiles"));
    expect(chain?.listing_label).toBe("Corporate chain");
    expect(chain?.priority.toLowerCase()).toBe("low");
    expect(Number(chain?.score)).toBeLessThan(Number(pack[0]?.score));
    expect(pack.indexOf(chain!)).toBeGreaterThan(0);
  });

  it("CSV export keeps persisted score and reason when scoringEvidence is stored", () => {
    const persistedReason = "Stored at search time — do not recompute.";
    const row = makeFixtureExportRow({
      name: "Persisted Score Dental",
      address: "99 Test Blvd, Austin, TX",
      score: 77,
      priority: "high",
      reason: persistedReason,
      opportunity_type: "visibility",
      metadata: {
        scoringEvidence: {
          marketMedianRating: 4.8,
          marketMedianReviewCount: 100,
          daysSinceLastReview: 120,
          reviewRecencyEnabled: true,
          reviewRecencyConfirmed: true,
          noReviewIn90Days: true,
          ratingVsMarket: null,
          reviewsVsMarket: null,
          website: null,
          gaps: ["No Google review in 90+ days"],
        },
      },
    });
    const withoutEvidence = makeFixtureExportRow({
      name: "Recompute Dental",
      address: "100 Test Blvd, Austin, TX",
      score: 77,
      reason: persistedReason,
    });
    const pack = buildLeadPackRowsFromExport([row, withoutEvidence]).filter(
      (p) => !isLeadPackInstructionRow(p)
    );
    const persisted = pack.find((p) => p.name === row.name)!;
    expect(persisted.score).toBe("77");
    expect(persisted.reason).toBe(persistedReason);
    expect(persisted.priority.toLowerCase()).toBe("high");
    expect(Number(persisted.score)).toBe(77);
    const recomputed = pack.find((p) => p.name === withoutEvidence.name)!;
    expect(recomputed.reason).not.toBe(persistedReason);
  });

  it("flags Frontier Trail co-tenants: one keeper, one demoted with cluster notes", () => {
    const pack = buildLeadPackRowsFromExport(SAMPLE_EXPORT.slice(0, 2));
    const data = pack.filter((p) => !isLeadPackInstructionRow(p));
    expect(data.length).toBe(2);
    expect(data.every((p) => p.cluster_notes.includes("Shared address with"))).toBe(true);
    const keeper = data.find((p) => p.name === "South Austin Dental Associates");
    const demoted = data.find((p) => p.name === "Austin Emergency Dental");
    expect(keeper).toBeTruthy();
    expect(demoted).toBeTruthy();
    expect(Number(keeper!.score)).toBeGreaterThan(Number(demoted!.score));
    expect(demoted!.priority.toLowerCase()).toBe("low");
  });

  it("WRITE_FIXED_CSV=1 writes dentily-austin-dental-leads-fixed.csv (optional)", () => {
    if (process.env.WRITE_FIXED_CSV !== "1") return;
    const pack = buildLeadPackRowsFromExport(SAMPLE_EXPORT);
    const csv = buildLeadPackCsv(pack);
    const out = join(process.cwd(), "dentily-austin-dental-leads-fixed.csv");
    writeFileSync(out, `\uFEFF${csv}`, "utf8");
    expect(out).toMatch(/fixed\.csv$/);
  });

  it("Marcus written outreach repeats at most 3 times across 50 synthetic rows", () => {
    const rows: ExportLeadRow[] = [];
    for (let i = 0; i < 50; i += 1) {
      const rating = [3.2, 4.8, 4.9, 5.0, 4.95][i % 5]!;
      const rc = [15, 45, 220, 1200, 350][i % 5]!;
      const website = i % 3 === 0 ? null : `https://practice${i}.example.com`;
      rows.push(
        makeFixtureExportRow({
          name: `Cascade Dental Study ${i}`,
          address: `${200 + i} Rio Grande St, Austin, TX 78701`,
          rating,
          review_count: rc,
          website,
          phone: `512-555-${String(1000 + i).slice(-4)}`,
          primary_email: `desk${i}@cascadetest${i}.com`,
          contact_form_url: `https://practice${i}.example.com/contact`,
        })
      );
    }
    const counts = new Map<string, number>();
    for (const r of rows) {
      const text = buildMarcusWrittenOutreach(exportRowToLead(r, 0));
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(8);
  });

  it("assigns Action Tier 1 when primary email is valid or contact form matches website root", () => {
    const pack = buildLeadPackRowsFromExport([
      makeFixtureExportRow({
        name: "Tier One By Email",
        address: "10 Oak St, Austin, TX 78701",
        website: "https://tieronebyemail.example.com",
        primary_email: "frontdesk@tieronebyemail.example.com",
        rating: 4.6,
        review_count: 90,
      }),
      makeFixtureExportRow({
        name: "Tier One By Form",
        address: "11 Oak St, Austin, TX 78701",
        website: "https://unicornprelaunch123.com",
        contact_form_url: "https://www.unicornprelaunch123.com/contact",
        rating: 4.7,
        review_count: 100,
      }),
    ]);
    expect(pack.find((p) => p.name === "Tier One By Email")?.action_tier).toBe(ACTION_TIER_READY);
    expect(pack.find((p) => p.name === "Tier One By Form")?.action_tier).toBe(ACTION_TIER_READY);
  });

  it("assigns Action Tier 2 when phone is present but there is no valid email or vetted contact form", () => {
    const pack = buildLeadPackRowsFromExport([
      makeFixtureExportRow({
        name: "Tier Two Phone Only",
        address: "12 Elm St, Austin, TX 78701",
        website: "https://tier2phone.example.com",
        phone: "5125550101",
        rating: 4.4,
        review_count: 70,
      }),
    ]);
    expect(pack.find((p) => p.name === "Tier Two Phone Only")?.action_tier).toBe(ACTION_TIER_CALL);
  });

  it("rejects unrelated contact form host (Sunset Hills / haiifamajicshop) and drops out of Tier 1", () => {
    const pack = buildLeadPackRowsFromExport([
      makeFixtureExportRow({
        name: "Sunset Hills Dentistry",
        address: "12 Oak St, Austin, TX 78701",
        website: "https://castordds.com",
        contact_form_url: "https://haiifamajicshop.com/contact",
        phone: "5125559911",
        rating: 4.5,
        review_count: 80,
      }),
    ]);
    const row = pack.find((p) => p.name === "Sunset Hills Dentistry");
    expect(row?.contact_form_url).not.toMatch(/haiifamajicshop/i);
    expect(row?.action_tier).toBe(ACTION_TIER_CALL);
  });

  it("assigns Action Tier 3 when there is no email, form, or phone", () => {
    const pack = buildLeadPackRowsFromExport([
      makeFixtureExportRow({
        name: "Tier Three No Path",
        address: "13 Oak St, Austin, TX 78701",
        website: "https://tierthree.example.com",
        rating: 4.2,
        review_count: 40,
      }),
    ]);
    expect(pack.find((p) => p.name === "Tier Three No Path")?.action_tier).toBe(ACTION_TIER_RESEARCH);
  });

  it("populates Why This Lead for every data row in the Austin sample pack", () => {
    const pack = buildLeadPackRowsFromExport(SAMPLE_EXPORT);
    const leads = pack.filter((p) => !isLeadPackInstructionRow(p));
    expect(leads.length).toBeGreaterThan(0);
    expect(leads.every((r) => r.why_this_lead.trim().length > 0)).toBe(true);
  });

  it("best contact is phone-only when no email or contact form is present", () => {
    const pack = buildLeadPackRowsFromExport([
      makeFixtureExportRow({
        name: "Phone Only Fixture",
        address: "9 Elm St, Austin, TX 78701",
        phone: "5125550190",
        rating: 4.0,
        review_count: 120,
      }),
    ]);
    const row = pack.find((p) => p.name === "Phone Only Fixture");
    expect(row?.best_contact_method).toBe("Phone (no digital path)");
  });

  it("export rebuild without scoring evidence never assigns Priority High (50-row stress)", () => {
    const rows: ExportLeadRow[] = [];
    for (let i = 0; i < 50; i += 1) {
      const tier = i % 5;
      const rating = tier === 0 ? 3.2 : tier === 1 ? 5.0 : tier === 2 ? 4.5 : tier === 3 ? 4.92 : 4.78;
      const rc = tier === 0 ? 40 : tier === 1 ? 1500 : tier === 2 ? 60 : tier === 3 ? 520 : 320;
      rows.push(
        makeFixtureExportRow({
          name: `Reachability Stress ${i}`,
          address: `${400 + i} Congress Ave, Austin, TX 78701`,
          rating,
          review_count: rc,
          website: tier === 0 ? null : `https://stress${i}.example.com`,
          phone: `512-444-${String(1000 + i).slice(-4)}`,
          primary_email: `hello${i}@stresstest${i}.com`,
          contact_form_url: `https://stress${i}.example.com/contact`,
        })
      );
    }
    const pack = buildLeadPackRowsFromExport(rows);
    const high = pack.filter(
      (p) => !isLeadPackInstructionRow(p) && p.priority.toLowerCase() === "high"
    ).length;
    expect(high).toBe(0);
  });
});
