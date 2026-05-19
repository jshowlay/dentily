export type SubscriptionPlan = "pro" | "starter_one_time";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "inactive";

export type SubscriptionRow = {
  id: number;
  userId: number;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  creditsRemaining: number;
  billingCycleStart: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type LeadCrmStatus =
  | "new"
  | "contacted"
  | "replied"
  | "booked"
  | "won"
  | "not_a_fit";

export const LEAD_CRM_STATUSES: LeadCrmStatus[] = [
  "new",
  "contacted",
  "replied",
  "booked",
  "won",
  "not_a_fit",
];

export type DashboardLead = {
  id: number;
  placeId: string;
  name: string;
  score: number | null;
  opportunityType: string | null;
  priority: string | null;
  reason: string | null;
  outreach: string | null;
  primaryEmail: string | null;
  contactFormUrl: string | null;
  phone: string | null;
  crmStatus: LeadCrmStatus;
  crmNote: string | null;
};

export type DashboardSearch = {
  id: number;
  niche: string;
  location: string;
  leadCount: number;
  isPaid: boolean;
  createdAt: string;
  leads: DashboardLead[];
};
