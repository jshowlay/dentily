import { getSearchForExport } from "@/lib/db";
import { ensurePaidPackReadyForExport } from "@/lib/ensure-paid-pack-ready";
import { marketLocationFilenamePart } from "@/lib/format-market-location";
import { buildLeadPackCsv, buildLeadPackRowsFromExport } from "@/lib/lead-pack-export";

/** Build the lead pack CSV bytes for a paid search (same pipeline as /api/search/[id]/export). */
export async function buildPackCsvAttachment(
  searchId: number
): Promise<{ buffer: Buffer; filename: string } | null> {
  const t0 = Date.now();
  const timings = await ensurePaidPackReadyForExport(searchId);
  console.log(`[build-pack-csv] searchId=${searchId} ready`, timings);
  const { search, rows } = await getSearchForExport(searchId);
  if (!search || rows.length === 0) return null;

  const packRows = buildLeadPackRowsFromExport(rows);
  const csv = buildLeadPackCsv(packRows);
  const filename = `dentily-${marketLocationFilenamePart(search.location)}-dental-leads-${searchId}.csv`;
  console.log(`[build-pack-csv] searchId=${searchId} csvReady totalMs=${Date.now() - t0}`);
  return { buffer: Buffer.from(`\uFEFF${csv}`, "utf-8"), filename };
}
