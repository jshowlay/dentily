export type Lead = {
  placeId: string;
  name: string;
  niche?: string | null;
  address: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  primaryType: string | null;
  mapsUrl: string | null;
  score?: number;
  reason?: string;
  outreach?: string;
  status?: string; // db status (e.g. "new")
  createdAt?: string;
  metadata: Record<string, unknown>; // raw source data, persisted to DB
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
  email: string | null;
  rating: number | null;
  review_count: number | null;
  score: number | null;
  reason: string | null;
  outreach: string | null;
  primary_type: string | null;
  maps_url: string | null;
  created_at: string | null;
};
