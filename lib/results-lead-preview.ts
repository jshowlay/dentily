import type { Lead } from "@/lib/types";
import type { PackExportAccessResult } from "@/lib/pack-export-access";

function outreachPreviewExcerpt(outreach: string | null | undefined, max = 220): string | undefined {
  const text = (outreach ?? "").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Hide contact paths and full outreach until checkout + buyer proof (admin bypass on server). */
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
 * Full lead detail on /results only when the pack is paid and the viewer has buyer proof.
 * Unpaid and paid-without-proof get {@link redactLeadsForPublicPreview}. Admin sees all.
 */
export function canViewFullLeadPackOnResults(
  isPaid: boolean,
  access: PackExportAccessResult
): boolean {
  if (access.allowed && access.via === "admin") return true;
  if (!isPaid) return false;
  return access.allowed;
}
