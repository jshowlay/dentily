import {
  isKnownMultiLocationChainListing,
  leadMatchesMultiLocationBrandKey,
  normalizeChainBrandKey,
} from "@/lib/admin-sample-chain-probe";
import { isGenericKeywordPracticeName } from "@/lib/admin-sample-eligibility";
import {
  isExcludedCommunityClinic,
  looksLikeIndividualProviderName,
} from "@/lib/lead-quality-filters";
import { classifyPriorityForLead } from "@/lib/dentist-scoring";
import {
  getLeadScoringEvidence,
  hasEvidenceBackedGap,
} from "@/lib/lead-scoring-evidence";
function priorityRank(priority: string | null | undefined): number {
  const v = (priority ?? "").toLowerCase();
  if (v === "high") return 3;
  if (v === "medium") return 2;
  return 1;
}
import {
  buildMultiLocationContext,
  isMultiLocationGroupLead,
  normalizeBrandKey,
} from "@/lib/multi-location-group";
import { registrableHostFromUrl } from "@/lib/url-normalize";
import type { Lead } from "@/lib/types";

export const PACK_LISTING_LABEL_METADATA_KEY = "packListingLabel";

export const PACK_LISTING_LABELS = {
  provider: "Provider listing",
  generic: "Generic listing",
  chain: "Chain location",
  community: "Community clinic",
} as const;

export type PackListingLabel = (typeof PACK_LISTING_LABELS)[keyof typeof PACK_LISTING_LABELS];

export const PACK_LISTING_SCORE_PENALTY = 22;

export type PackListingContext = {
  marketCity: string | null;
  multiCtx: ReturnType<typeof buildMultiLocationContext>;
  chainBrandKeys: Set<string>;
  sharedDomainPlaceIds: Set<string>;
  sharedBrandPlaceIds: Set<string>;
  sharedChainBrandPlaceIds: Set<string>;
};

export function getPackListingLabelFromLead(
  lead: Pick<Lead, "metadata">
): PackListingLabel | null {
  const raw = lead.metadata?.[PACK_LISTING_LABEL_METADATA_KEY];
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw as PackListingLabel;
}

export function isIndependentPackListing(lead: Pick<Lead, "metadata">): boolean {
  return getPackListingLabelFromLead(lead) == null;
}

function markSharedGroupPlaceIds(leads: Lead[], keyFn: (l: Lead) => string): Set<string> {
  const groups = new Map<string, Lead[]>();
  for (const lead of leads) {
    const key = keyFn(lead);
    if (!key || key.length < 2) continue;
    const list = groups.get(key) ?? [];
    list.push(lead);
    groups.set(key, list);
  }
  const out = new Set<string>();
  for (const list of Array.from(groups.values())) {
    if (list.length < 2) continue;
    for (const l of list) out.add(l.placeId);
  }
  return out;
}

export function buildPackListingContext(
  leads: Lead[],
  marketCity?: string | null,
  chainBrandKeys: Set<string> = new Set()
): PackListingContext {
  const sharedDomainPlaceIds = markSharedGroupPlaceIds(leads, (lead) => {
    const domain = registrableHostFromUrl(lead.website);
    return domain && domain.length >= 4 ? domain : "";
  });
  const sharedBrandPlaceIds = markSharedGroupPlaceIds(leads, (lead) => normalizeBrandKey(lead.name));
  const sharedChainBrandPlaceIds = markSharedGroupPlaceIds(leads, (lead) =>
    normalizeChainBrandKey(lead.name)
  );

  return {
    marketCity: marketCity ?? null,
    multiCtx: buildMultiLocationContext(leads),
    chainBrandKeys,
    sharedDomainPlaceIds,
    sharedBrandPlaceIds,
    sharedChainBrandPlaceIds,
  };
}

/** Same categories as /admin/sample exclusions — used for demotion in paid packs, not removal. */
export function resolvePackListingLabel(
  lead: Lead,
  ctx: PackListingContext
): PackListingLabel | null {
  if (isExcludedCommunityClinic(lead)) return PACK_LISTING_LABELS.community;
  if (looksLikeIndividualProviderName(lead.name)) return PACK_LISTING_LABELS.provider;
  if (isGenericKeywordPracticeName(lead.name, ctx.marketCity)) return PACK_LISTING_LABELS.generic;
  if (isMultiLocationGroupLead(lead, ctx.multiCtx)) return PACK_LISTING_LABELS.chain;
  if (isKnownMultiLocationChainListing(lead)) return PACK_LISTING_LABELS.chain;
  if (leadMatchesMultiLocationBrandKey(lead, ctx.chainBrandKeys)) return PACK_LISTING_LABELS.chain;
  if (ctx.sharedDomainPlaceIds.has(lead.placeId)) return PACK_LISTING_LABELS.chain;
  if (ctx.sharedBrandPlaceIds.has(lead.placeId)) return PACK_LISTING_LABELS.chain;
  if (ctx.sharedChainBrandPlaceIds.has(lead.placeId)) return PACK_LISTING_LABELS.chain;
  return null;
}

export function compareLeadsForPaidPack(a: Lead, b: Lead): number {
  const aDem = !isIndependentPackListing(a);
  const bDem = !isIndependentPackListing(b);
  if (aDem !== bDem) return aDem ? 1 : -1;

  if (!aDem && !bDem) {
    const aGap = hasEvidenceBackedGap(getLeadScoringEvidence(a));
    const bGap = hasEvidenceBackedGap(getLeadScoringEvidence(b));
    if (aGap !== bGap) return aGap ? -1 : 1;
  }

  const pr = priorityRank(b.priority) - priorityRank(a.priority);
  if (pr !== 0) return pr;
  return (b.score ?? -Infinity) - (a.score ?? -Infinity);
}

export function sortLeadsForPaidPack<T extends Lead>(rows: T[]): T[] {
  return [...rows].sort(compareLeadsForPaidPack);
}

/** Score demotion + metadata label; independents (with evidence gaps first) sort above labeled rows. */
export function applyPackListingQualityRankAdjustments(
  leads: Lead[],
  marketCity?: string | null,
  options?: { chainBrandKeys?: Set<string> }
): Lead[] {
  const ctx = buildPackListingContext(leads, marketCity, options?.chainBrandKeys ?? new Set());
  const adjusted = leads.map((lead) => {
    const label = resolvePackListingLabel(lead, ctx);
    if (!label) return lead;
    const score = Math.max(1, (lead.score ?? 50) - PACK_LISTING_SCORE_PENALTY);
    return {
      ...lead,
      score,
      priority: classifyPriorityForLead(lead, score),
      metadata: {
        ...lead.metadata,
        [PACK_LISTING_LABEL_METADATA_KEY]: label,
        multiLocationGroup: label === PACK_LISTING_LABELS.chain ? true : lead.metadata?.multiLocationGroup,
      },
    };
  });
  return sortLeadsForPaidPack(adjusted);
}

export function marketCityFromSearchLocation(location: string): string {
  return location.split(",")[0]?.trim() || location.trim();
}

/** For expensive evidence: prefer independent listings by prelim score. */
export function selectIndependentPlaceIdsForExpensiveEvidence(
  leads: Lead[],
  ctx: PackListingContext,
  limit: number
): Set<string> {
  const prelim = leads.map((lead) => ({
    lead,
    prelimScore: lead.score ?? 0,
  }));
  prelim.sort((a, b) => b.prelimScore - a.prelimScore);
  const ids = new Set<string>();
  for (const { lead } of prelim) {
    if (ids.size >= limit) break;
    if (resolvePackListingLabel(lead, ctx) != null) continue;
    if (lead.placeId) ids.add(lead.placeId);
  }
  return ids;
}
