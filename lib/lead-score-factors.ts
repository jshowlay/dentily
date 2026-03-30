import type { Lead } from "@/lib/types";

const OPP_LABELS: Record<string, string> = {
  no_website: "No public website (discovery gap)",
  low_reviews: "Low reviews (visibility opportunity)",
  moderate_reviews_growth: "Moderate reviews (room to grow demand)",
  reputation_improvement: "Rating profile (reputation angle)",
  general_growth: "General local growth profile",
};

function opportunityLine(type: string | null | undefined): string | null {
  if (!type) return null;
  const human = OPP_LABELS[type] ?? type.replace(/_/g, " ");
  return `Signal type: ${human}`;
}

/**
 * Explainability copy from fields we actually store — no invented model internals.
 */
export function describeScoreFactors(lead: Lead): string[] {
  const lines: string[] = [];
  const opp = opportunityLine(lead.opportunityType);
  if (opp) lines.push(opp);

  if (lead.rating != null && lead.rating !== undefined) {
    lines.push(`Google Maps rating: ${lead.rating}`);
  } else {
    lines.push("Rating: not available on listing");
  }

  if (lead.reviewCount != null && lead.reviewCount !== undefined) {
    lines.push(`Review count: ${lead.reviewCount} (local demand proxy)`);
  } else {
    lines.push("Review count: not available");
  }

  if (lead.website?.trim()) {
    lines.push("Website on file — listing completeness");
  } else {
    lines.push("No website on file — outreach / SEO angle");
  }

  if (lead.phone?.trim()) {
    lines.push("Phone present — contact-ready");
  } else {
    lines.push("Phone missing — lower contact completeness");
  }

  const es = lead.emailStatus;
  if (lead.primaryEmail?.trim()) {
    lines.push(
      `Mailbox on file — best path: email${lead.emailSource ? ` (${lead.emailSource.replace(/_/g, " ")})` : ""}`
    );
  } else if (lead.contactFormUrl?.trim() || es === "contact_form_only") {
    lines.push("Best path: website contact form (when no public email yet)");
  } else if (lead.phone?.trim()) {
    lines.push("Best path: phone from Maps — pack is actionable without email");
  } else if (es === "pending") {
    lines.push("Optional website email check may still run — use phone or Maps meanwhile");
  } else if (es === "skipped") {
    lines.push("No email scrape on this row — use phone, Maps, or manual research");
  } else if (es === "invalid") {
    lines.push("Quick site check discarded a bad address — prefer phone or form");
  } else if (es === "not_found") {
    lines.push("No email on quick homepage pass — normal; use phone or form if listed");
  }

  if (lead.mapsUrl) {
    lines.push("Source: Google Maps business listing");
  }

  if (lead.address?.trim()) {
    lines.push("Address on file — local relevance");
  }

  if (lead.reason?.trim()) {
    lines.push(`Summary: ${lead.reason.trim()}`);
  }

  return lines;
}
