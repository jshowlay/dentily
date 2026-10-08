import type { Lead } from "@/lib/types";
import type { PackExportAccessResult } from "@/lib/pack-export-access";

function outreachPreviewExcerpt(outreach: string | null | undefined, max = 220): string | undefined {
  const text = (outreach ?? "").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Hide contact paths and full outreach until the buyer proves purchase (or pack is not paid yet). */
export function redactLeadsForPublicPreview(leads: Lead[]): Lead[] {
  return leads.map((lead) => ({
    ...lead,
    website: null,
    primaryEmail: null,
    contactFormUrl: null,
    phone: null,
    outreach: outreachPreviewExcerpt(lead.outreach),
    metadata: {},
  }));
}

/**
 * Full lead detail on /results when the search is paid and the viewer has buyer proof,
 * or the search is still pre-purchase (same preview the runner sees before checkout).
 * Admin always sees full rows for support.
 */
export function canViewFullLeadPackOnResults(
  isPaid: boolean,
  access: PackExportAccessResult
): boolean {
  if (access.allowed && access.via === "admin") return true;
  if (!isPaid) return true;
  return access.allowed;
}
