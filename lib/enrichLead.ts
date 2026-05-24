import Anthropic from "@anthropic-ai/sdk";
import type { Lead } from "@/lib/types";

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

const client = new Anthropic();

export interface LeadInput {
  name: string;
  address: string;
  website: string;
  phone?: string;
  rating?: number | string;
  reviewCount?: number | string;
  score?: number | string;
  priority?: string;
  opportunityType?: string;
  actionTier?: string;
  whyThisLead?: string;
  reason?: string;
  whyNow?: string;
  clusterNotes?: string;
  bestContactMethod?: string;
  outreachReadiness?: string;
  estimatedOpportunity?: string;
}

export interface EnrichedFields {
  primaryEmail: string;
  otherEmails: string;
  contactFormUrl: string;
  emailSource: string;
  emailRejectionReason: string;
  whyNow: string;
  clusterNotes: string;
  enrichmentNotes: string;
  apolloEnrichment: string;
}

export type LeadIntelligenceMetadata = {
  otherEmails?: string;
  whyNow?: string;
  clusterNotes?: string;
  apolloEnrichment?: string;
};

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function leadToEnrichInput(lead: Lead): LeadInput {
  const intel = (lead.metadata?.intelligence ?? {}) as LeadIntelligenceMetadata;
  return {
    name: lead.name,
    address: lead.address ?? "",
    website: lead.website ?? "",
    phone: lead.phone ?? undefined,
    rating: lead.rating ?? undefined,
    reviewCount: lead.reviewCount ?? undefined,
    score: lead.score ?? undefined,
    priority: lead.priority ?? undefined,
    opportunityType: lead.opportunityType ?? undefined,
    whyThisLead: lead.reason ?? undefined,
    reason: lead.reason ?? undefined,
    whyNow: intel.whyNow,
    clusterNotes: intel.clusterNotes,
  };
}

function looksLikeEmail(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  return v.includes("@") && !v.toUpperCase().includes("NEEDS MANUAL LOOKUP");
}

/** Merge AI enrichment onto a lead; preserve existing non-empty scalar fields. */
export function applyAiEnrichmentToLead(lead: Lead, fields: EnrichedFields): Lead {
  const intel: LeadIntelligenceMetadata = {
    otherEmails: fields.otherEmails?.trim() || undefined,
    whyNow: fields.whyNow?.trim() || undefined,
    clusterNotes: fields.clusterNotes?.trim() || undefined,
    apolloEnrichment: fields.apolloEnrichment?.trim() || undefined,
  };

  const primary =
    (lead.primaryEmail?.trim() || fields.primaryEmail?.trim() || "").trim() || null;
  const resolvedPrimary =
    primary && !primary.toUpperCase().includes("NEEDS MANUAL LOOKUP") ? primary : lead.primaryEmail;

  const mergedNotes = [lead.enrichmentNotes?.trim(), fields.enrichmentNotes?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    ...lead,
    primaryEmail: resolvedPrimary ?? lead.primaryEmail,
    contactFormUrl: lead.contactFormUrl?.trim() || fields.contactFormUrl?.trim() || lead.contactFormUrl,
    emailSource: lead.emailSource ?? "inferred",
    emailRejectionReason:
      lead.emailRejectionReason?.trim() || fields.emailRejectionReason?.trim() || lead.emailRejectionReason,
    enrichmentNotes: mergedNotes || lead.enrichmentNotes || fields.enrichmentNotes || null,
    emailStatus: looksLikeEmail(resolvedPrimary)
      ? "found"
      : lead.emailStatus === "pending"
        ? "not_found"
        : lead.emailStatus,
    metadata: {
      ...lead.metadata,
      intelligence: {
        ...((lead.metadata?.intelligence ?? {}) as LeadIntelligenceMetadata),
        ...intel,
      },
    },
  };
}

export async function enrichLead(lead: LeadInput): Promise<EnrichedFields> {
  const prompt = `You are a dental industry lead intelligence analyst for Dentily, a B2B sales tool for dental marketing agencies targeting practices across the US.

Fill in the missing intelligence fields for this dental practice lead.

LEAD DATA:
- Name: ${lead.name}
- Address: ${lead.address}
- Website: ${lead.website}
- Phone: ${lead.phone || ""}
- Rating: ${lead.rating || ""}
- Review Count: ${lead.reviewCount || ""}
- Score: ${lead.score || ""}
- Priority: ${lead.priority || ""}
- Opportunity Type: ${lead.opportunityType || ""}
- Action Tier: ${lead.actionTier || ""}
- Why This Lead: ${lead.whyThisLead || ""}
- Reason: ${lead.reason || ""}
- Best Contact Method: ${lead.bestContactMethod || ""}
- Outreach Readiness: ${lead.outreachReadiness || ""}
- Estimated Opportunity: ${lead.estimatedOpportunity || ""}

Return ONLY valid JSON — no markdown, no preamble:
{
  "primaryEmail": "Predict the most likely direct email using the website domain. Common patterns: info@domain.com, hello@domain.com, office@domain.com. If doctor name is in the practice name use firstname@domain.com. Extract domain from Website field.",
  "otherEmails": "1-2 alternative email patterns on the same domain, comma separated",
  "contactFormUrl": "Build the most likely contact page URL from the website. Append /contact, /contact-us, /appointment, or /book-appointment. For cosmetic/spa practices use /book-appointment. For general practices use /contact.",
  "emailSource": "Inferred from domain pattern",
  "emailRejectionReason": "Not yet verified — inferred address",
  "whyNow": "1-2 specific sentences on the timing signal that makes this practice worth contacting NOW. Reference their exact rating, review count, opportunity type, and city. Be specific, not generic.",
  "clusterNotes": "1-2 sentences on this practice's specific neighbourhood and market context — local competition density, area income level, demographics, and what that means for dental acquisition ROI.",
  "enrichmentNotes": "2-3 sentences of practice intelligence: service mix signals from name and branding (cosmetic vs general vs specialty), owner-operated vs group indicators, digital presence quality, and what the sales rep needs to know before making contact.",
  "apolloEnrichment": "Specific Apollo.io search instructions: if a doctor name is visible in the practice name search for them directly by name + DDS title + city. Otherwise search the practice name + city + Dentist or Owner title. Include the domain to search on."
}

Rules:
- Be specific to THIS practice — no generic filler text
- Extract the domain from the Website field for all email predictions
- Reference exact numbers and exact location in whyNow and clusterNotes`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {
      primaryEmail: "NEEDS MANUAL LOOKUP",
      otherEmails: "",
      contactFormUrl: lead.website ? `${lead.website.replace(/\/$/, "")}/contact` : "",
      emailSource: "Enrichment failed",
      emailRejectionReason: "Parse error",
      whyNow: "",
      clusterNotes: "",
      enrichmentNotes: "",
      apolloEnrichment: "",
    };
  }
}

export async function enrichLeads(
  leads: LeadInput[],
  concurrency = 3
): Promise<EnrichedFields[]> {
  const results: EnrichedFields[] = [];

  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((lead) => enrichLead(lead)));
    results.push(...batchResults);
    if (i + concurrency < leads.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}
