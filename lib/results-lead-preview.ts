import {
  signalDisplayForLead,
} from "@/components/results/results-utils";
import { sanitizeLeadsForClient, type ClientLead } from "@/lib/client-leads";
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
  if (!isPaid) return false;
  if (access.allowed && access.via === "admin") return true;
  return access.allowed;
}

function countDistinctResultSignals(fullLeads: Lead[]): number {
  const set = new Set<string>();
  for (const lead of fullLeads) {
    const sig = signalDisplayForLead(lead);
    if (sig) set.add(sig.label);
  }
  return set.size;
}

/** Signals from full rows; contact paths redacted unless buyer access. */
export function prepareLeadsForResultsClient(
  fullLeads: Lead[],
  hasBuyerAccess: boolean
): { leads: ClientLead[]; signalTypeCount: number } {
  const signalTypeCount = countDistinctResultSignals(fullLeads);
  const leads = fullLeads.map((lead) => {
    const displaySignal = signalDisplayForLead(lead);
    const row = hasBuyerAccess ? lead : redactLeadsForPublicPreview([lead])[0]!;
    return sanitizeLeadsForClient([{ ...row, displaySignal }])[0]!;
  });
  return { leads, signalTypeCount };
}
