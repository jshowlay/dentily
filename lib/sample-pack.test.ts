import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AUSTIN_SAMPLE_PACK_EXPORT_ROWS } from "@/lib/austin-sample-pack-rows";
import { makeFixtureExportRow } from "@/lib/lead-pipeline-fixtures";
import {
  buildLeadPackCsv,
  buildLeadPackRowsFromExport,
  isLeadPackInstructionRow,
  LEAD_PACK_INSTRUCTION_ROW_NAME,
} from "@/lib/lead-pack-export";
import { buildMarcusWrittenOutreach } from "@/lib/marcus-outreach";
import { exportRowToLead } from "@/lib/export-lead-adapter";

const PERSONA_STRINGS = ["Marcus", "Ellery", "Dallas DSO", "paid acquisition for a"] as const;
const ZIP_CITY_REF = /[Ii]n [A-Z]{2} \d{5}/;
const OUTREACH_HEADER = "Outreach Draft (customize before sending)";

describe("Austin public sample pack", () => {
  it("passes launch-ready CSV checks in memory", () => {
    const pack = buildLeadPackRowsFromExport(AUSTIN_SAMPLE_PACK_EXPORT_ROWS);
    const csv = buildLeadPackCsv(pack);
    expect(csv).toContain("Apollo Enrichment");
    expect(csv).toContain(OUTREACH_HEADER);
    expect(csv).toContain("Placeholders Remaining");
    expect(csv).toContain("Action Tier");
    expect(csv).toContain("Why This Lead");

    const names = pack.map((r) => r.name);
    expect(names[0]).toBe(LEAD_PACK_INSTRUCTION_ROW_NAME);
    expect(names.includes(LEAD_PACK_INSTRUCTION_ROW_NAME)).toBe(true);

    const leadRows = pack.filter((r) => !isLeadPackInstructionRow(r));
    expect(leadRows.length).toBeGreaterThanOrEqual(7);

    for (const r of leadRows) {
      const o = r.outreach_draft;
      for (const s of PERSONA_STRINGS) {
        expect(o.includes(s), `Persona string ${s} in ${r.name}`).toBe(false);
      }
      expect(ZIP_CITY_REF.test(o), `ZIP-style city in ${r.name}`).toBe(false);
      expect(r.placeholders_remaining.trim().length).toBeGreaterThan(0);
      let replaced = o.replaceAll("{{your_name}}", "Alex Buyer");
      replaced = replaced.replaceAll("{{your_company}}", "Buyer Co");
      replaced = replaced.replaceAll("{{your_credibility_line}}", "I help dental practices grow.");
      expect(replaced.includes("{{")).toBe(false);
    }

    const priorities = leadRows.map((r) => r.priority.toLowerCase());
    expect(priorities.filter((p) => p === "high").length).toBeGreaterThanOrEqual(1);

    const channels = new Set(leadRows.map((r) => r.best_contact_method));
    expect(channels.has("Email")).toBe(true);
    expect(channels.has("Contact Form")).toBe(true);
  });

  it("writes public/sample/dentily-sample-pack-austin.csv when GENERATE_SAMPLE_PACK=1", () => {
    if (process.env.GENERATE_SAMPLE_PACK !== "1") return;
    const pack = buildLeadPackRowsFromExport(AUSTIN_SAMPLE_PACK_EXPORT_ROWS);
    const csv = buildLeadPackCsv(pack);
    const dir = join(process.cwd(), "public", "sample");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "dentily-sample-pack-austin.csv"), `\uFEFF${csv}`, "utf8");
  });

  it("four-part US addresses use parsed city name in outreach, not state + ZIP phrasing", () => {
    const row = makeFixtureExportRow({
      name: "Miami Four Part Test",
      address: "1 Biscayne Blvd, Miami, FL 33130, United States",
      website: "https://example.com/",
      rating: 3.2,
      review_count: 50,
    });
    const text = buildMarcusWrittenOutreach(exportRowToLead(row, 0));
    expect(ZIP_CITY_REF.test(text)).toBe(false);
    expect(text).toMatch(/Miami/i);
  });
});
