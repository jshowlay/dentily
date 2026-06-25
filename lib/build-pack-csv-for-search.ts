import { getSearchForExport } from "@/lib/db";
import { toSlugPart } from "@/lib/csv";
import { buildLeadPackCsv, buildLeadPackRowsFromExport } from "@/lib/lead-pack-export";

/** Build the lead pack CSV bytes for a paid search (same pipeline as /api/search/[id]/export). */
export async function buildPackCsvAttachment(
  searchId: number
): Promise<{ buffer: Buffer; filename: string } | null> {
  const { search, rows } = await getSearchForExport(searchId);
  if (!search || rows.length === 0) return null;

  const packRows = buildLeadPackRowsFromExport(rows);
  const csv = buildLeadPackCsv(packRows);
  const filename = `dentily-${toSlugPart(search.location)}-dental-leads-${searchId}.csv`;
  return { buffer: Buffer.from(`\uFEFF${csv}`, "utf-8"), filename };
}
