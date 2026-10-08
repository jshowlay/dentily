import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AUSTIN_SAMPLE_PACK_EXPORT_ROWS } from "@/lib/austin-sample-pack-rows";
import { buildLeadPackCsv, buildLeadPackRowsFromExport, isLeadPackInstructionRow } from "@/lib/lead-pack-export";
import { AUSTIN_PIPELINE_SAMPLE_EXPORT } from "@/lib/lead-pipeline-fixtures";
import type { LeadPackCsvRow } from "@/lib/lead-pack-export";
import type { ExportLeadRow } from "@/lib/types";

const ACTION_T1 = "Tier 1: Ready to Contact";
const ACTION_T2 = "Tier 2: Call First";

function isHigh(r: LeadPackCsvRow) {
  return r.priority.toLowerCase() === "high";
}
function isMedium(r: LeadPackCsvRow) {
  return r.priority.toLowerCase() === "medium";
}
function isLow(r: LeadPackCsvRow) {
  return r.priority.toLowerCase() === "low";
}
function hasEmail(r: LeadPackCsvRow) {
  return Boolean(r.primary_email?.trim());
}
function isFormOnly(r: LeadPackCsvRow) {
  return (
    r.action_tier === ACTION_T1 &&
    r.best_contact_method === "Contact Form" &&
    !hasEmail(r)
  );
}
function isHighVolumeSaturation(r: LeadPackCsvRow) {
  return r.opportunity_type.toLowerCase().includes("saturation");
}

/** Pick 10 data rows matching the homepage sample mix as closely as the pool allows. */
function selectTenAustinSampleRows(data: LeadPackCsvRow[]): LeadPackCsvRow[] {
  const pool = [...data];
  const out: LeadPackCsvRow[] = [];
  const used = new Set<string>();

  const take = (pred: (r: LeadPackCsvRow) => boolean, n: number) => {
    let added = 0;
    for (const r of pool) {
      if (added >= n) break;
      if (used.has(r.name)) continue;
      if (!pred(r)) continue;
      out.push(r);
      used.add(r.name);
      added += 1;
    }
  };

  take((r) => isHigh(r) && r.action_tier === ACTION_T1 && hasEmail(r), 2);
  take((r) => isHigh(r) && isFormOnly(r), 3);
  take((r) => isMedium(r) && r.action_tier === ACTION_T1, 2);
  take((r) => isMedium(r) && r.action_tier === ACTION_T2, 1);
  take((r) => isLow(r), 1);
  take((r) => isHighVolumeSaturation(r), 1);

  for (const r of pool) {
    if (out.length >= 10) break;
    if (used.has(r.name)) continue;
    out.push(r);
    used.add(r.name);
  }

  return out.slice(0, 10);
}

describe("dentily-sample-austin.csv generator", () => {
  it("selects 10 distinct rows from combined Austin exports", () => {
    const combined: ExportLeadRow[] = [...AUSTIN_SAMPLE_PACK_EXPORT_ROWS, ...AUSTIN_PIPELINE_SAMPLE_EXPORT];
    const pack = buildLeadPackRowsFromExport(combined);
    const data = pack.filter((r) => !isLeadPackInstructionRow(r));
    const ten = selectTenAustinSampleRows(data);
    expect(ten).toHaveLength(10);
    expect(new Set(ten.map((r) => r.name)).size).toBe(10);
  });

  it("WRITE_DENTILY_SAMPLE_AUSTIN_CSV=1 writes public/sample/dentily-sample-austin.csv", () => {
    if (process.env.WRITE_DENTILY_SAMPLE_AUSTIN_CSV !== "1") return;

    const combined: ExportLeadRow[] = [...AUSTIN_SAMPLE_PACK_EXPORT_ROWS, ...AUSTIN_PIPELINE_SAMPLE_EXPORT];
    const pack = buildLeadPackRowsFromExport(combined);
    expect(pack.some((r) => isLeadPackInstructionRow(r))).toBe(false);

    const data = pack.filter((r) => !isLeadPackInstructionRow(r));
    expect(data.length).toBeGreaterThanOrEqual(10);

    const ten = selectTenAustinSampleRows(data);
    expect(ten).toHaveLength(10);

    const csv = buildLeadPackCsv(ten);
    const out = join(process.cwd(), "public", "sample", "dentily-sample-austin.csv");
    writeFileSync(out, `\uFEFF${csv}`, "utf8");
    expect(out).toMatch(/dentily-sample-austin\.csv$/);
  });
});
