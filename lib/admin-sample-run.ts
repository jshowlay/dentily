import { ADMIN_SAMPLE_RESULT_LIMIT } from "@/lib/admin-sample-config";
import { discoverMultiLocationBrandKeys } from "@/lib/admin-sample-chain-probe";
import { filterLeadsForAdminSample } from "@/lib/admin-sample-eligibility";
import { buildAdminSampleEmailReason, buildDistinctAdminSampleEmailReasons } from "@/lib/admin-sample-email-copy";
import {
  formatAdminSampleEmailBullets,
  type AdminSampleLead,
} from "@/lib/admin-sample-format";
import { leadToExportRow } from "@/lib/austin-homepage-sample";
import { buildScoredLeads } from "@/lib/build-scored-leads";
import { computeBestContactMethod } from "@/lib/contact-labels";
import { batchEnrichLeads } from "@/lib/email-enrichment";
import { computeWhyThisLeadFromLead } from "@/lib/lead-scoring-evidence";
import { buildMarcusWrittenOutreach } from "@/lib/marcus-outreach";
import { isMultiLocationGroupLead, MULTI_LOCATION_GROUP_LABEL } from "@/lib/multi-location-group";
import { getNicheConfig } from "@/lib/niches";
import type { Lead } from "@/lib/types";

export { ADMIN_SAMPLE_RESULT_LIMIT } from "@/lib/admin-sample-config";

export type { AdminSampleLead } from "@/lib/admin-sample-format";
export { formatAdminSampleEmailBullets } from "@/lib/admin-sample-format";

function pitchExcerpt(outreach: string, max = 280): string {
  const text = outreach.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function leadToAdminSampleRow(lead: Lead, emailCopyReason: string): AdminSampleLead {
  const exportRow = leadToExportRow(lead);
  const whyThisLead = computeWhyThisLeadFromLead({
    ...lead,
    score: lead.score ?? exportRow.score ?? undefined,
    priority: lead.priority ?? exportRow.priority ?? undefined,
    opportunityType: lead.opportunityType ?? exportRow.opportunity_type ?? undefined,
  });

  const draft = (lead.outreach ?? "").trim() || buildMarcusWrittenOutreach(lead);
  const multi = isMultiLocationGroupLead(lead);

  return {
    name: lead.name,
    score: Number(lead.score) || 0,
    tier: multi ? MULTI_LOCATION_GROUP_LABEL : (lead.priority ?? "medium").toString(),
    whyThisLead,
    bestContactMethod: computeBestContactMethod({
      primary_email: lead.primaryEmail,
      contact_form_url: lead.contactFormUrl,
      phone: lead.phone,
    }),
    pitchAngle: pitchExcerpt(draft),
    opportunityType: multi
      ? MULTI_LOCATION_GROUP_LABEL
      : (lead.opportunityType ?? "").replace(/_/g, " "),
    address: lead.address,
    emailCopyReason,
  };
}

/** Top independent practices for a market — website crawl only (no Hunter / ZeroBounce / Apollo). */
export async function runAdminSampleMarket(
  city: string,
  state: string,
  limit = ADMIN_SAMPLE_RESULT_LIMIT
): Promise<AdminSampleLead[]> {
  const nicheConfig = getNicheConfig("dentists");
  const location = `${city.trim()}, ${state.trim().toUpperCase()}`;
  const scored = await buildScoredLeads({
    niche: nicheConfig.name,
    location,
    nicheConfig,
    subscriptionUserId: null,
    searchId: 0,
  });
  const chainBrandKeys = await discoverMultiLocationBrandKeys(scored, location);
  const eligible = filterLeadsForAdminSample(scored, city.trim(), { multiLocationBrandKeys: chainBrandKeys });
  const top = eligible.slice(0, limit);
  const enriched = await batchEnrichLeads(top, undefined, { hunterFallback: false });

  const emailReasons = buildDistinctAdminSampleEmailReasons(enriched);
  return enriched.map((lead, i) => leadToAdminSampleRow(lead, emailReasons[i] ?? buildAdminSampleEmailReason(lead, i)));
}
