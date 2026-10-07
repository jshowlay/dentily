import { ADMIN_SAMPLE_RESULT_LIMIT } from "@/lib/admin-sample-config";
import { filterLeadsForAdminSample } from "@/lib/admin-sample-eligibility";
import { buildAdminSampleEmailReason, buildDistinctAdminSampleEmailReasons } from "@/lib/admin-sample-email-copy";
import { leadToExportRow } from "@/lib/austin-homepage-sample";
import { buildScoredLeads } from "@/lib/build-scored-leads";
import { computeBestContactMethod } from "@/lib/contact-labels";
import { batchEnrichLeads } from "@/lib/email-enrichment";
import { computeWhyThisLead } from "@/lib/lead-pack-export";
import { buildMarcusWrittenOutreach } from "@/lib/marcus-outreach";
import { isMultiLocationGroupLead, MULTI_LOCATION_GROUP_LABEL } from "@/lib/multi-location-group";
import { getNicheConfig } from "@/lib/niches";
import { classifyPracticeOwnership } from "@/lib/practice-ownership";
import type { Lead } from "@/lib/types";

export { ADMIN_SAMPLE_RESULT_LIMIT } from "@/lib/admin-sample-config";

export type AdminSampleLead = {
  name: string;
  score: number;
  tier: string;
  whyThisLead: string;
  bestContactMethod: string;
  pitchAngle: string;
  opportunityType: string;
  address: string | null;
  emailCopyReason: string;
};

function pitchExcerpt(outreach: string, max = 280): string {
  const text = outreach.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function leadToAdminSampleRow(lead: Lead, emailCopyReason: string): AdminSampleLead {
  const exportRow = leadToExportRow(lead);
  const ownership = classifyPracticeOwnership({
    name: lead.name,
    website: lead.website,
    googleListingWebsite: lead.website,
    primaryEmail: lead.primaryEmail,
    contactFormUrl: lead.contactFormUrl,
    homepageMentionsSmileGeneration: false,
  });
  const whyThisLead = computeWhyThisLead({
    ...exportRow,
    score: lead.score ?? exportRow.score,
    priority: lead.priority ?? exportRow.priority,
    opportunity_type: lead.opportunityType ?? exportRow.opportunity_type,
    why_now: exportRow.why_now?.trim() ?? "",
    cluster_notes: exportRow.cluster_notes?.trim() ?? "",
    cluster_demoted: false,
    ownership,
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

function formatEmailBulletLine(name: string, reason: string, maxWords = 25): string {
  let r = reason.trim();
  let line = `• ${name}: ${r}`;
  let words = line.split(/\s+/).filter(Boolean);
  while (words.length > maxWords && r.includes(" ")) {
    r = r.replace(/\s+\S+$/, "").replace(/[,;—-]+$/, "");
    line = `• ${name}: ${r}`;
    words = line.split(/\s+/).filter(Boolean);
  }
  if (words.length > maxWords) {
    line = words.slice(0, maxWords).join(" ");
  }
  return line;
}

export function formatAdminSampleEmailBullets(leads: AdminSampleLead[], count = 3): string {
  return leads
    .slice(0, count)
    .map((l) => formatEmailBulletLine(l.name, l.emailCopyReason))
    .join("\n");
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

  const eligible = filterLeadsForAdminSample(scored, city.trim());
  const top = eligible.slice(0, limit);
  const enriched = await batchEnrichLeads(top, undefined, { hunterFallback: false });

  const emailReasons = buildDistinctAdminSampleEmailReasons(enriched);
  return enriched.map((lead, i) => leadToAdminSampleRow(lead, emailReasons[i] ?? buildAdminSampleEmailReason(lead, i)));
}
