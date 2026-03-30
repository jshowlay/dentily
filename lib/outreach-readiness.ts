import type { EmailStatus } from "@/lib/types";

export type OutreachReadiness = "high" | "medium" | "low";

function trim(s: string | null | undefined): string {
  return (s ?? "").trim();
}

export type ContactSignalLead = {
  primaryEmail?: string | null;
  contactFormUrl?: string | null;
  phone?: string | null;
  emailStatus?: EmailStatus | null;
};

/** True if the lead has any practical outreach path (email, form, or phone from Maps). */
export function isLeadContactable(lead: ContactSignalLead): boolean {
  return Boolean(trim(lead.primaryEmail) || trim(lead.contactFormUrl) || trim(lead.phone));
}

/**
 * Readiness from real contact channels — not email-scrape alone.
 * - high: verified mailbox on file
 * - medium: form URL, phone, pending enrichment, or form-only scrape
 * - low: no email, form, or phone
 */
export function outreachReadinessFromContactSignals(lead: ContactSignalLead): OutreachReadiness {
  if (trim(lead.primaryEmail)) return "high";
  if (trim(lead.contactFormUrl) || lead.emailStatus === "contact_form_only") return "medium";
  if (trim(lead.phone)) return "medium";
  if (lead.emailStatus === "pending") return "medium";
  return "low";
}

/**
 * @deprecated Prefer outreachReadinessFromContactSignals — email-only view.
 * Kept for narrow call sites that only have status.
 */
export function outreachReadinessFromEmailStatus(
  status: EmailStatus | null | undefined
): OutreachReadiness {
  if (status === "found") return "high";
  if (status === "contact_form_only") return "medium";
  if (status === "pending") return "medium";
  return "low";
}
