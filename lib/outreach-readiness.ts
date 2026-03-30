import type { EmailStatus } from "@/lib/types";

export type OutreachReadiness = "high" | "medium" | "low";

/**
 * Derived outreach signal for UI/CSV — not stored in DB.
 * - high: direct email found
 * - medium: contact form URL without a validated email
 * - low: missing, skipped, invalid, or unknown
 */
export function outreachReadinessFromEmailStatus(
  status: EmailStatus | null | undefined
): OutreachReadiness {
  if (status === "found") return "high";
  if (status === "contact_form_only") return "medium";
  return "low";
}
