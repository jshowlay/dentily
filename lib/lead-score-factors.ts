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
