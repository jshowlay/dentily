import { formatMarketLocation } from "@/lib/format-market-location";
import { NO_WEBSITE_ON_GOOGLE_LISTING_LABEL } from "@/lib/no-website-signal";
import { getLeadScoringEvidence } from "@/lib/lead-scoring-evidence";
import { sortLeadsForPaidPack } from "@/lib/pack-listing-quality";
import type { Lead } from "@/lib/types";

export type PriorityFilter = "all" | "high" | "medium" | "low";
export type SortMode = "score-desc" | "priority" | "reviews";

const SIGNAL_ICONS: Record<string, string> = {
  reputation_gap: "⚑",
  no_website: "◎",
  low_review_volume: "↑",
  newer_unknown: "↑",
  established_static: "◈",
  general_growth: "→",
  high_volume_saturation: "✦",
  no_online_booking: "◎",
  reputation_improvement: "⚑",
  low_reviews: "↑",
  moderate_reviews_growth: "→",
};

export function leadRowKey(lead: Lead, index: number): string {
  return `${lead.placeId ?? lead.name}-${index}`;
}

export function normalizeOpportunityKey(type: string | null | undefined): string {
  return (type ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function signalIcon(type: string | null | undefined): string {
  const key = normalizeOpportunityKey(type);
  return SIGNAL_ICONS[key] ?? "→";
}

export function signalLabel(type: string | null | undefined, reason?: string | null): string {
  const key = normalizeOpportunityKey(type);
  const plain: Record<string, string> = {
    reputation_gap: "Reputation gap",
    no_website: NO_WEBSITE_ON_GOOGLE_LISTING_LABEL,
    low_review_volume: "Low review volume",
    newer_unknown: "Low review volume",
    established_static: "Strong reviews, few gaps",
    general_growth: "General growth",
    high_volume_saturation: "Very high review count",
    no_online_booking: "No online booking",
  };
  if (plain[key]) return plain[key];
  if (reason?.trim()) {
    const short = reason.trim();
    return short.length > 72 ? `${short.slice(0, 72)}…` : short;
  }
  if (!type) return "—";
  return type.replace(/_/g, " ");
}

function hasLowReviewVolumeEvidence(
  lead: Pick<Lead, "metadata" | "reviewCount">
): boolean {
  const ev = getLeadScoringEvidence(lead);
  return Boolean(ev?.reviewsVsMarket);
}

/** Human-readable signal for results table; omit when not evidence-backed. */
export function signalDisplayForLead(
  lead: Pick<Lead, "opportunityType" | "reason" | "metadata" | "reviewCount" | "website" | "rating">
): { icon: string; label: string } | null {
  const key = normalizeOpportunityKey(lead.opportunityType);
  if (!key) return null;

  const ev = getLeadScoringEvidence(lead);
  const hasSite = Boolean((lead.website ?? "").trim());

  if (ev?.website?.hasOnlineBooking === false && hasSite) {
    return { icon: SIGNAL_ICONS.no_online_booking ?? "◎", label: "No online booking" };
  }

  if (key === "no_website" && !hasSite) {
    return { icon: SIGNAL_ICONS.no_website!, label: NO_WEBSITE_ON_GOOGLE_LISTING_LABEL };
  }

  if (key === "reputation_gap" && ev?.ratingVsMarket) {
    return { icon: SIGNAL_ICONS.reputation_gap!, label: "Reputation gap" };
  }

  if ((key === "newer_unknown" || key === "low_review_volume") && hasLowReviewVolumeEvidence(lead)) {
    return { icon: SIGNAL_ICONS.low_review_volume!, label: "Low review volume" };
  }

  if (key === "high_volume_saturation" && (lead.reviewCount ?? 0) >= 900) {
    return { icon: SIGNAL_ICONS.high_volume_saturation!, label: "Very high review count" };
  }

  if (key === "established_static" && (ev?.gaps.length ?? 0) > 0) {
    return { icon: SIGNAL_ICONS.established_static!, label: "Strong reviews, few gaps" };
  }

  if (key === "general_growth") {
    return null;
  }

  if (ev?.gaps.length) {
    if (ev.ratingVsMarket) {
      return { icon: SIGNAL_ICONS.reputation_gap!, label: "Reputation gap" };
    }
    if (ev.reviewsVsMarket) {
      return { icon: SIGNAL_ICONS.low_review_volume!, label: "Low review volume" };
    }
    if (key === "established_static") {
      return { icon: SIGNAL_ICONS.established_static!, label: "Strong reviews, few gaps" };
    }
  }

  return null;
}

export function cityFromAddress(address: string | null | undefined): string {
  if (!address?.trim()) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 3] ?? parts[0];
  if (parts.length >= 2) return parts[parts.length - 2] ?? parts[0];
  return parts[0] ?? "";
}

export function cityLabelFromLocation(location: string): string {
  const formatted = formatMarketLocation(location);
  if (formatted) return formatted;
  return "your market";
}

export function scoreBadgeClass(score: number | null | undefined): string {
  if (score == null || Number.isNaN(Number(score))) return "is-faded";
  const n = Number(score);
  if (n >= 60) return "is-high";
  if (n >= 45) return "is-mid";
  return "is-faded";
}

export function priorityClass(priority: string | null | undefined): string {
  const p = (priority ?? "").toLowerCase();
  if (p === "high") return "is-high";
  if (p === "medium") return "is-medium";
  return "is-low";
}

export function priorityRank(priority: string | null | undefined): number {
  const p = (priority ?? "").toLowerCase();
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}

export function countByPriority(leads: Lead[]) {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const lead of leads) {
    const p = (lead.priority ?? "").toLowerCase();
    if (p === "high") high += 1;
    else if (p === "medium") medium += 1;
    else low += 1;
  }
  return { high, medium, low, all: leads.length };
}

export function distinctSignalTypes(leads: Lead[]): number {
  const set = new Set<string>();
  for (const lead of leads) {
    const sig = signalDisplayForLead(lead);
    if (sig) set.add(sig.label);
  }
  return set.size;
}

export function filterLeads(leads: Lead[], filter: PriorityFilter): Lead[] {
  if (filter === "all") return leads;
  return leads.filter((l) => (l.priority ?? "").toLowerCase() === filter);
}

export function sortLeads(leads: Lead[], mode: SortMode): Lead[] {
  const copy = [...leads];
  if (mode === "score-desc" || mode === "priority") {
    return sortLeadsForPaidPack(copy);
  }
  copy.sort((a, b) => (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0));
  return copy;
}

export type OutreachSegment = { type: "text" | "token"; value: string };

/** Split outreach for display — CSV data keeps {{…}} tokens unchanged. */
export function parseOutreachPreview(text: string | null | undefined): OutreachSegment[] {
  if (!text?.trim()) return [{ type: "text", value: "—" }];
  const tokenMap: Record<string, string> = {
    "{{your_name}}": "[your name]",
    "{{your_company}}": "[your company]",
    "{{your_credibility_line}}": "[your hook]",
  };
  const parts = text.split(/(\{\{your_name\}\}|\{\{your_company\}\}|\{\{your_credibility_line\}\})/g);
  return parts
    .filter((p) => p.length > 0)
    .map((part) =>
      tokenMap[part] ? { type: "token" as const, value: tokenMap[part] } : { type: "text" as const, value: part }
    );
}
