import {
  discoverMultiLocationBrandKeys,
  leadMatchesMultiLocationBrandKey,
  normalizeChainBrandKey,
} from "@/lib/admin-sample-chain-probe";
import {
  PUBLIC_SEARCH_CHAIN_PROBE_MAX,
  PUBLIC_SEARCH_CHAIN_PROBE_TOP_SCORED,
} from "@/lib/public-search-runtime-config";
import { isGenericKeywordPracticeName } from "@/lib/admin-sample-eligibility";
import {
  DSO_BRAND_NAME_FRAGMENTS,
  isCorporateDentalBrandDomain,
  websiteIndicatesCorporateLocationsNetwork,
} from "@/lib/dso-brands";
import {
  isExcludedCommunityClinic,
  looksLikeEntityRegistrationName,
  looksLikeIndividualProviderName,
} from "@/lib/lead-quality-filters";
import { classifyPriorityForLead } from "@/lib/dentist-scoring";
import {
  getLeadScoringEvidence,
  hasEvidenceBackedGap,
} from "@/lib/lead-scoring-evidence";
import {
  buildMultiLocationContext,
  isMultiLocationGroupLead,
  normalizeBrandKey,
} from "@/lib/multi-location-group";
import { registrableHostFromUrl } from "@/lib/url-normalize";
import type { Lead } from "@/lib/types";

function priorityRank(priority: string | null | undefined): number {
  const v = (priority ?? "").toLowerCase();
  if (v === "high") return 3;
  if (v === "medium") return 2;
  return 1;
}

export const PACK_LISTING_LABEL_METADATA_KEY = "packListingLabel";
export const PACK_OFFICE_COUNT_METADATA_KEY = "packOfficeCount";

/** Set on `searches.metadata` after deferred Places chain probe + pack re-rank. */
export const SEARCH_PACK_CHAIN_FINALIZED_AT_KEY = "packChainProbeFinalizedAt";
export const SEARCH_PACK_CHAIN_KEY_COUNT_KEY = "packChainProbeKeyCount";

export const PACK_LISTING_LABELS = {
  provider: "Provider listing",
  generic: "Generic listing",
  corporateChain: "Corporate chain",
  multiOffice: "Multi-office practice",
  community: "Community clinic",
  /** Legacy label from earlier exports — treated as {@link PACK_LISTING_LABELS.corporateChain}. */
  chain: "Chain location",
} as const;

export type PackListingLabel = (typeof PACK_LISTING_LABELS)[keyof typeof PACK_LISTING_LABELS];

export const PACK_LISTING_SCORE_PENALTY = 22;

const LOCAL_MULTI_OFFICE_MAX = 4;

export type PackListingContext = {
  marketCity: string | null;
  multiCtx: ReturnType<typeof buildMultiLocationContext>;
  chainBrandKeys: Set<string>;
  sharedDomainPlaceIds: Set<string>;
  sharedBrandPlaceIds: Set<string>;
  sharedChainBrandPlaceIds: Set<string>;
  domainGroupSizeByPlaceId: Map<string, number>;
  brandGroupSizeByPlaceId: Map<string, number>;
};

export function normalizeStoredPackListingLabel(
  raw: string | null | undefined
): PackListingLabel | null {
  if (!raw?.trim()) return null;
  if (raw === PACK_LISTING_LABELS.chain) return PACK_LISTING_LABELS.corporateChain;
  return raw as PackListingLabel;
}

export function getPackListingLabelFromLead(
  lead: Pick<Lead, "metadata">
): PackListingLabel | null {
  const raw = lead.metadata?.[PACK_LISTING_LABEL_METADATA_KEY];
  return normalizeStoredPackListingLabel(typeof raw === "string" ? raw : null);
}

export function packListingLabelAppliesScorePenalty(label: PackListingLabel | null): boolean {
  if (!label) return false;
  if (label === PACK_LISTING_LABELS.multiOffice) return false;
  return true;
}

export function isIndependentPackListing(lead: Pick<Lead, "metadata">): boolean {
  const label = getPackListingLabelFromLead(lead);
  if (!label) return true;
  return label === PACK_LISTING_LABELS.multiOffice;
}

function buildGroupSizeByPlaceId(leads: Lead[], keyFn: (l: Lead) => string): {
  members: Set<string>;
  sizeByPlaceId: Map<string, number>;
} {
  const groups = new Map<string, Lead[]>();
  for (const lead of leads) {
    const key = keyFn(lead);
    if (!key || key.length < 2) continue;
    const list = groups.get(key) ?? [];
    list.push(lead);
    groups.set(key, list);
  }
  const members = new Set<string>();
  const sizeByPlaceId = new Map<string, number>();
  for (const list of Array.from(groups.values())) {
    if (list.length < 2) continue;
    for (const l of list) {
      members.add(l.placeId);
      sizeByPlaceId.set(l.placeId, list.length);
    }
  }
  return { members, sizeByPlaceId };
}

function markSharedGroupPlaceIds(leads: Lead[], keyFn: (l: Lead) => string): Set<string> {
  return buildGroupSizeByPlaceId(leads, keyFn).members;
}

function marketCitySlug(marketCity: string | null | undefined): string {
  return (marketCity ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** True when the practice site host plausibly references the search market (e.g. boise in domain). */
export function websiteDomainMentionsMarketCity(
  website: string | null | undefined,
  marketCity: string | null | undefined
): boolean {
  const slug = marketCitySlug(marketCity);
  if (!slug || slug.length < 3) return true;
  const host = (registrableHostFromUrl(website) ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!host) return true;
  if (host.includes(slug)) return true;
  const parts = (marketCity ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((p) => p.length >= 4);
  return parts.some((p) => host.includes(p));
}

function packOfficeCountFromLead(lead: Lead): number | null {
  const raw = lead.metadata?.[PACK_OFFICE_COUNT_METADATA_KEY];
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 2) return Math.trunc(raw);
  return null;
}

function groupSizeForLead(
  lead: Lead,
  ctx: PackListingContext,
  kind: "domain" | "brand"
): number {
  const map = kind === "domain" ? ctx.domainGroupSizeByPlaceId : ctx.brandGroupSizeByPlaceId;
  return map.get(lead.placeId) ?? 0;
}

function isLocalMarketLocationPage(
  website: string | null | undefined,
  marketCity: string | null | undefined
): boolean {
  const slug = marketCitySlug(marketCity);
  if (!slug || !website?.trim()) return false;
  try {
    const u = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    const path = u.pathname.toLowerCase();
    if (path.includes(slug)) return true;
    const stateSlug = (marketCity ?? "").split(",")[1]?.trim().toLowerCase();
    if (stateSlug && stateSlug.length === 2 && path.includes(stateSlug)) return true;
  } catch {
    return false;
  }
  return false;
}

function hasExplicitCorporateChainSignals(lead: Lead, ctx: PackListingContext): boolean {
  const n = (lead.name ?? "").toLowerCase();
  if (DSO_BRAND_NAME_FRAGMENTS.some((frag) => n.includes(frag))) return true;
  const domain = registrableHostFromUrl(lead.website);
  if (domain && isCorporateDentalBrandDomain(domain)) return true;
  if (websiteIndicatesCorporateLocationsNetwork(lead.website)) {
    if (isLocalMarketLocationPage(lead.website, ctx.marketCity)) return false;
    return true;
  }
  return false;
}

function isCorporateChainLead(lead: Lead, ctx: PackListingContext): boolean {
  if (hasExplicitCorporateChainSignals(lead, ctx)) return true;

  if (ctx.sharedChainBrandPlaceIds.has(lead.placeId)) return true;

  const domainSize = groupSizeForLead(lead, ctx, "domain");
  if (
    domainSize >= 5 &&
    !websiteDomainMentionsMarketCity(lead.website, ctx.marketCity) &&
    ctx.sharedDomainPlaceIds.has(lead.placeId)
  ) {
    return true;
  }

  if (
    leadMatchesMultiLocationBrandKey(lead, ctx.chainBrandKeys) &&
    hasExplicitCorporateChainSignals(lead, ctx)
  ) {
    return true;
  }

  return false;
}

/** Maps listing named “… Endodontics Boise” with a group site — local office, not corporate DSO. */
function isCitySuffixedSpecialtyLocationListing(lead: Lead, ctx: PackListingContext): boolean {
  if (isCorporateChainLead(lead, ctx)) return false;
  const city = (ctx.marketCity ?? "").split(",")[0]?.trim();
  if (!city || city.length < 3) return false;
  const name = (lead.name ?? "").trim();
  if (!/\b(endodontics|orthodontics|periodontics)\b/i.test(name)) return false;
  const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`\\b${escaped}\\s*$`, "i").test(name)) return false;
  return Boolean(lead.website?.trim());
}

function isLocalMultiOfficeLead(lead: Lead, ctx: PackListingContext): boolean {
  if (isCorporateChainLead(lead, ctx)) return false;

  if (isCitySuffixedSpecialtyLocationListing(lead, ctx)) return true;

  const officeCount = packOfficeCountFromLead(lead);
  if (officeCount != null && officeCount >= 2 && officeCount <= LOCAL_MULTI_OFFICE_MAX) {
    return true;
  }

  const brandSize = groupSizeForLead(lead, ctx, "brand");
  const domainSize = groupSizeForLead(lead, ctx, "domain");

  if (
    brandSize >= 2 &&
    brandSize <= LOCAL_MULTI_OFFICE_MAX &&
    ctx.sharedBrandPlaceIds.has(lead.placeId)
  ) {
    return true;
  }

  if (
    domainSize >= 2 &&
    domainSize <= LOCAL_MULTI_OFFICE_MAX &&
    ctx.sharedDomainPlaceIds.has(lead.placeId)
  ) {
    const domain = registrableHostFromUrl(lead.website);
    if (domain && isCorporateDentalBrandDomain(domain)) return false;
    if (websiteIndicatesCorporateLocationsNetwork(lead.website)) {
      if (isLocalMarketLocationPage(lead.website, ctx.marketCity)) return true;
      return false;
    }
    return true;
  }

  if (isMultiLocationGroupLead(lead, ctx.multiCtx)) return true;

  if (leadMatchesMultiLocationBrandKey(lead, ctx.chainBrandKeys)) return true;

  if (
    websiteIndicatesCorporateLocationsNetwork(lead.website) &&
    isLocalMarketLocationPage(lead.website, ctx.marketCity)
  ) {
    return true;
  }

  return false;
}

export function buildPackListingContext(
  leads: Lead[],
  marketCity?: string | null,
  chainBrandKeys: Set<string> = new Set()
): PackListingContext {
  const domainGroups = buildGroupSizeByPlaceId(leads, (lead) => {
    const domain = registrableHostFromUrl(lead.website);
    return domain && domain.length >= 4 ? domain : "";
  });
  const brandGroups = buildGroupSizeByPlaceId(leads, (lead) => normalizeBrandKey(lead.name));

  return {
    marketCity: marketCity ?? null,
    multiCtx: buildMultiLocationContext(leads),
    chainBrandKeys,
    sharedDomainPlaceIds: domainGroups.members,
    sharedBrandPlaceIds: brandGroups.members,
    sharedChainBrandPlaceIds: markSharedGroupPlaceIds(leads, (lead) =>
      normalizeChainBrandKey(lead.name)
    ),
    domainGroupSizeByPlaceId: domainGroups.sizeByPlaceId,
    brandGroupSizeByPlaceId: brandGroups.sizeByPlaceId,
  };
}

/** Same categories as /admin/sample exclusions — used for demotion in paid packs, not removal. */
export function resolvePackListingLabel(
  lead: Lead,
  ctx: PackListingContext
): PackListingLabel | null {
  if (isExcludedCommunityClinic(lead)) return PACK_LISTING_LABELS.community;
  if (looksLikeIndividualProviderName(lead.name)) return PACK_LISTING_LABELS.provider;
  if (looksLikeEntityRegistrationName(lead.name)) return PACK_LISTING_LABELS.generic;
  if (isGenericKeywordPracticeName(lead.name, ctx.marketCity)) return PACK_LISTING_LABELS.generic;
  if (isCorporateChainLead(lead, ctx)) return PACK_LISTING_LABELS.corporateChain;
  if (isLocalMultiOfficeLead(lead, ctx)) return PACK_LISTING_LABELS.multiOffice;
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

function listingMetadataPatch(
  lead: Lead,
  label: PackListingLabel | null
): Record<string, unknown> {
  if (!label) return { ...lead.metadata };
  return {
    ...lead.metadata,
    [PACK_LISTING_LABEL_METADATA_KEY]: label,
    multiLocationGroup:
      label === PACK_LISTING_LABELS.corporateChain ||
      label === PACK_LISTING_LABELS.multiOffice ||
      label === PACK_LISTING_LABELS.chain
        ? true
        : lead.metadata?.multiLocationGroup,
  };
}

function isUnpenalizedListingLabel(label: PackListingLabel | null): boolean {
  return label == null || label === PACK_LISTING_LABELS.multiOffice;
}

/** Score demotion + metadata label; independents (with evidence gaps first) sort above labeled rows. */
export function applyPackListingQualityRankAdjustments(
  leads: Lead[],
  marketCity?: string | null,
  options?: { chainBrandKeys?: Set<string> }
): Lead[] {
  const ctx = buildPackListingContext(leads, marketCity, options?.chainBrandKeys ?? new Set());

  const tagged = leads.map((lead) => ({
    lead,
    label: resolvePackListingLabel(lead, ctx),
  }));

  const ranked = tagged.map(({ lead, label }) => {
    const score = lead.score ?? 50;
    if (isUnpenalizedListingLabel(label)) {
      return {
        lead,
        label,
        score,
        priority: classifyPriorityForLead(lead, score),
      };
    }
    return { lead, label, score, priority: "low" as const };
  });

  const minHighAmongUnpenalized = ranked
    .filter((r) => isUnpenalizedListingLabel(r.label) && r.priority === "high")
    .reduce((min, r) => Math.min(min, r.score ?? Infinity), Infinity);

  const penalizedScoreCap =
    Number.isFinite(minHighAmongUnpenalized) && minHighAmongUnpenalized > 1
      ? minHighAmongUnpenalized - 1
      : 1;

  const adjusted = ranked.map(({ lead, label, score, priority }) => {
    if (isUnpenalizedListingLabel(label)) {
      return {
        ...lead,
        score,
        priority,
        metadata: listingMetadataPatch(lead, label),
      };
    }
    const penalized = Math.max(1, score - PACK_LISTING_SCORE_PENALTY);
    const finalScore = Math.min(penalized, penalizedScoreCap);
    return {
      ...lead,
      score: finalScore,
      priority: "low" as const,
      metadata: listingMetadataPatch(lead, label),
    };
  });

  return sortLeadsForPaidPack(adjusted);
}

export function marketCityFromSearchLocation(location: string): string {
  return location.split(",")[0]?.trim() || location.trim();
}

/** In-pack heuristics only (no Places chain probes) — used on the blocking search request. */
export function applyInitialDentistPackListingRank(leads: Lead[], location: string): Lead[] {
  const marketCity = marketCityFromSearchLocation(location);
  return applyPackListingQualityRankAdjustments(leads, marketCity, { chainBrandKeys: new Set() });
}

/**
 * Places chain probes + full pack labels — run during background enrich so
 * POST /api/search returns sooner.
 */
export async function finalizeDentistPackListingWithChainProbe(
  leads: Lead[],
  location: string
): Promise<{ leads: Lead[]; chainProbeMs: number; chainKeyCount: number }> {
  const marketCity = marketCityFromSearchLocation(location);
  const tChain = Date.now();
  let chainBrandKeys = new Set<string>();
  try {
    chainBrandKeys = await discoverMultiLocationBrandKeys(leads, location, {
      maxProbes: PUBLIC_SEARCH_CHAIN_PROBE_MAX,
      probeFromTopScored: PUBLIC_SEARCH_CHAIN_PROBE_TOP_SCORED,
    });
  } catch (e) {
    console.warn("[pack-listing-quality] chain probe failed", e);
  }
  const chainProbeMs = Date.now() - tChain;
  const ranked = applyPackListingQualityRankAdjustments(leads, marketCity, { chainBrandKeys });
  return { leads: ranked, chainProbeMs, chainKeyCount: chainBrandKeys.size };
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
    if (!isIndependentPackListing(lead)) continue;
    if (lead.placeId) ids.add(lead.placeId);
  }
  return ids;
}
