import type { Lead } from "@/lib/types";

export type PriorityFilter = "all" | "high" | "medium" | "low";
export type SortMode = "score-desc" | "priority" | "reviews";

const SIGNAL_ICONS: Record<string, string> = {
  reputation_gap: "⚑",
  no_website: "◎",
  newer_unknown: "↑",
  established_static: "◈",
  general_growth: "→",
  high_volume_saturation: "✦",
  reputation_improvement: "⚑",
  low_reviews: "↑",
  moderate_reviews_growth: "→",
};

const SIGNAL_LABELS: Record<string, string> = {
  reputation_gap: "Reputation gap",
  no_website: "No website",
  newer_unknown: "Newer unknown",
  established_static: "Established static",
  general_growth: "General growth",
  high_volume_saturation: "High volume saturation",
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
  if (SIGNAL_LABELS[key]) return SIGNAL_LABELS[key];
  if (reason?.trim()) {
    const short = reason.trim();
    return short.length > 72 ? `${short.slice(0, 72)}…` : short;
  }
  if (!type) return "—";
  return type.replace(/_/g, " ");
}

export function cityFromAddress(address: string | null | undefined): string {
  if (!address?.trim()) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 3] ?? parts[0];
  if (parts.length >= 2) return parts[parts.length - 2] ?? parts[0];
  return parts[0] ?? "";
}

export function cityLabelFromLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return "your market";
  const first = trimmed.split(",")[0]?.trim();
  return first || trimmed;
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
    const key = normalizeOpportunityKey(lead.opportunityType);
    if (key) set.add(key);
  }
  return set.size;
}

export function filterLeads(leads: Lead[], filter: PriorityFilter): Lead[] {
  if (filter === "all") return leads;
  return leads.filter((l) => (l.priority ?? "").toLowerCase() === filter);
}

export function sortLeads(leads: Lead[], mode: SortMode): Lead[] {
  const copy = [...leads];
  if (mode === "score-desc") {
    copy.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    return copy;
  }
  if (mode === "priority") {
    copy.sort((a, b) => {
      const pr = priorityRank(a.priority) - priorityRank(b.priority);
      if (pr !== 0) return pr;
      return (Number(b.score) || 0) - (Number(a.score) || 0);
    });
    return copy;
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
