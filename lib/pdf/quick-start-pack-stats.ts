import {
  buildLeadPackRowsFromExport,
  isLeadPackInstructionRow,
  type LeadPackCsvRow,
} from "@/lib/lead-pack-export";
import type { ExportLeadRow } from "@/lib/types";

export type QuickStartPackStats = {
  totalPractices: number;
  contactableLeads: number;
  topPriorityLeads: number;
  emailCount: number;
  formCount: number;
  phoneCount: number;
};

export function computeQuickStartPackStatsFromCsvRows(rows: LeadPackCsvRow[]): QuickStartPackStats {
  const data = rows.filter((r) => !isLeadPackInstructionRow(r));
  let emailCount = 0;
  let formCount = 0;
  let phoneCount = 0;
  let contactableLeads = 0;
  let topPriorityLeads = 0;

  for (const r of data) {
    const method = (r.best_contact_method ?? "").trim();
    if (method === "Email") emailCount += 1;
    else if (method === "Contact Form") formCount += 1;
    else if (method.toLowerCase().includes("phone")) phoneCount += 1;

    const contactable = (r.contactable ?? "").trim().toLowerCase();
    if (contactable === "yes" || method === "Email" || method === "Contact Form") {
      contactableLeads += 1;
    }

    if ((r.priority ?? "").trim().toLowerCase() === "high") topPriorityLeads += 1;
  }

  return {
    totalPractices: data.length,
    contactableLeads,
    topPriorityLeads,
    emailCount,
    formCount,
    phoneCount,
  };
}

/** Same cleaned export pipeline as buyer CSV (dedupe, gates, collapse). */
export function computeQuickStartPackStatsFromExportRows(
  exportRows: ExportLeadRow[]
): QuickStartPackStats {
  const pack = buildLeadPackRowsFromExport(exportRows);
  return computeQuickStartPackStatsFromCsvRows(pack);
}
