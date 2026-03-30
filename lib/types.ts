export type EmailStatus = "found" | "contact_form_only" | "not_found" | "invalid" | "skipped";

export type EmailSource =
  | "website"
  | "mailto"
  | "contact_page"
  | "footer"
  | "about_page"
  | "manual"
  | "unknown"
  | null;

export type LeadEnrichmentFields = {
  primaryEmail: string | null;
  contactFormUrl: string | null;
  emailStatus: EmailStatus;
  emailSource: EmailSource;
  enrichmentNotes: string | null;
};

export type Lead = {
  placeId: string;
  name: string;
  niche?: string | null;
  address: string | null;
  website: string | null;
  /** Enriched business contact email (website crawl). Legacy DB column `email` is kept in sync on write. */
  primaryEmail: string | null;
  contactFormUrl: string | null;
  emailStatus: EmailStatus | null;
  emailSource: EmailSource;
  enrichmentNotes: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  primaryType: string | null;
  mapsUrl: string | null;
  score?: number;
  reason?: string;
  outreach?: string;
  opportunityType?: string | null;
  priority?: string | null;
  status?: string; // db status (e.g. "new")
  createdAt?: string;
  metadata: Record<string, unknown>; // raw source data, persisted to DB
};

/** Use on new leads before enrichment runs. */
export const EMPTY_LEAD_ENRICHMENT: Pick<
  Lead,
  "primaryEmail" | "contactFormUrl" | "emailStatus" | "emailSource" | "enrichmentNotes"
> = {
  primaryEmail: null,
  contactFormUrl: null,
  emailStatus: null,
  emailSource: null,
  enrichmentNotes: null,
};

export type SearchPayload = {
  niche: string;
  location: string;
};

export type SearchRecord = {
  id: number;
  niche: string;
  location: string;
  status: string;
  resultCount: number;
  errorMessage: string | null;
  isPaid: boolean;
  createdAt?: string;
};

export type SearchWithLeads = SearchRecord & {
  leads: Lead[];
};

export type NicheConfig = {
  id: string;
  name: string;
  description: string;
  scoringFactors: string[];
  disqualifiers: string[];
  outreachStyle: string;
  idealCustomerDescription: string;
};

export type ExportLeadRow = {
  name: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  primary_email: string | null;
  contact_form_url: string | null;
  email_status: string | null;
  email_source: string | null;
  enrichment_notes: string | null;
  outreach_readiness: string | null;
  rating: number | null;
  review_count: number | null;
  score: number | null;
  reason: string | null;
  outreach: string | null;
  priority: string | null;
  opportunity_type: string | null;
  primary_type: string | null;
  maps_url: string | null;
  created_at: string | null;
};
