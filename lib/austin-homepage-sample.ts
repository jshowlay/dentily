import { isValidContactFormUrl } from "@/lib/contact-form-url";
import type { LeadPackCsvRow } from "@/lib/lead-pack-export";
import { isLeadPackInstructionRow, normalizeAddressKey } from "@/lib/lead-pack-export";
import { normalizePracticeDisplayName } from "@/lib/practice-name";
import type { ExportLeadRow, Lead } from "@/lib/types";
import { isLeadContactable, outreachReadinessFromContactSignals } from "@/lib/outreach-readiness";
import { emailMatchesWebsiteDomain, googleMapsUrlHasCid } from "@/lib/url-normalize";

export function leadToExportRow(lead: Lead): ExportLeadRow {
  const primary = lead.primaryEmail ?? null;
  const signal = {
    primaryEmail: primary,
    contactFormUrl: lead.contactFormUrl ?? null,
    phone: lead.phone ?? null,
    emailStatus: lead.emailStatus ?? null,
  };
  const intel = (lead.metadata?.intelligence ?? {}) as {
    otherEmails?: string;
    whyNow?: string;
    clusterNotes?: string;
    apolloEnrichment?: string;
    homepageMentionsSmileGeneration?: boolean;
  };
  return {
    name: lead.name ?? null,
    address: lead.address ?? null,
    website: lead.website ?? null,
    phone: lead.phone ?? null,
    primary_email: primary,
    other_emails: intel.otherEmails ?? null,
    contact_form_url: lead.contactFormUrl ?? null,
    email_status: lead.emailStatus ?? null,
    email_source: lead.emailSource ?? null,
    enrichment_notes: lead.enrichmentNotes ?? null,
    email_rejection_reason: lead.emailRejectionReason ?? null,
    why_now: intel.whyNow ?? null,
    cluster_notes: intel.clusterNotes ?? null,
    apollo_enrichment: intel.apolloEnrichment ?? null,
    contactable: isLeadContactable(signal),
    outreach_readiness: outreachReadinessFromContactSignals(signal),
    rating: lead.rating ?? null,
    review_count: lead.reviewCount ?? null,
    score: lead.score ?? null,
    reason: lead.reason ?? null,
    outreach: lead.outreach ?? null,
    priority: lead.priority ?? null,
    opportunity_type: lead.opportunityType ?? null,
    primary_type: lead.primaryType ?? null,
    maps_url: lead.mapsUrl ?? null,
    created_at: null,
    homepage_dso_smile_generation: intel.homepageMentionsSmileGeneration ?? null,
  };
}

function oppKey(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function websiteHost(url: string | null | undefined): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  try {
    return new URL(u.startsWith("http") ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function formKey(url: string | null | undefined): string {
  const u = (url ?? "").trim();
  if (!u) return "";
  try {
    const parsed = new URL(u.startsWith("http") ? u : `https://${u}`);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

/** Shared brand / multi-location (same site domain). */
function brandKey(name: string | null | undefined, website: string | null | undefined): string {
  const host = websiteHost(website);
  if (host) return host;
  const n = (name ?? "").toLowerCase();
  const stripped = n.replace(/\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
  return stripped.slice(0, 48);
}

export function isPhoneOnlyRow(r: LeadPackCsvRow): boolean {
  return (r.best_contact_method ?? "").toLowerCase().includes("phone");
}

export function hasFoundEmailRow(r: LeadPackCsvRow): boolean {
  return Boolean(r.primary_email?.trim()) && (r.email_status ?? "").toLowerCase() === "found";
}

export function isLikelyDsoRow(r: LeadPackCsvRow): boolean {
  return (r.ownership ?? "").toLowerCase().includes("likely dso");
}

export function isOnDomainPrimaryRow(r: LeadPackCsvRow): boolean {
  if (!hasFoundEmailRow(r)) return true;
  return emailMatchesWebsiteDomain(r.primary_email!.trim(), r.website);
}

export function isSampleEligibleRow(r: LeadPackCsvRow): boolean {
  return !isLikelyDsoRow(r) && isOnDomainPrimaryRow(r);
}

export function isIndependentRow(r: LeadPackCsvRow): boolean {
  return (r.ownership ?? "").trim().toLowerCase() === "independent";
}

/** Fixed homepage showcase set (regenerate in this order; row 1 = Top Lead). */
export const PINNED_AUSTIN_HOMEPAGE_SAMPLE_NAMES = [
  "Dental Smiles",
  "Forest Family Dentistry - Eastside",
  "Smile 360",
  "Treaty Oak Dental",
  "Arboretum & Westlake Orthodontics",
  "Toothbar",
  "Bala Smiles Orthodontics",
  "38th Street Dental",
  "My Care Dental",
  "South Austin Dental Implant Studio",
] as const;

/** When the same practice name maps to multiple Places listings, prefer on-domain email and avoid saturation rows. */
export function pinnedNameRowPreferenceScore(r: LeadPackCsvRow): number {
  let s = Number(r.score) || 0;
  if (hasFoundEmailRow(r) && isOnDomainPrimaryRow(r)) s += 120;
  else if (hasFoundEmailRow(r)) s += 40;
  else if (isFormPrimaryRow(r)) s += 20;
  if (isPhoneOnlyRow(r)) s -= 40;
  if (oppKey(r.opportunity_type) === "high_volume_saturation") s -= 200;
  return s;
}

export function pickBestRowForPinnedPracticeName(
  pool: LeadPackCsvRow[],
  pinnedDisplayName: string
): LeadPackCsvRow | null {
  const key = normalizePracticeDisplayName(pinnedDisplayName).toLowerCase();
  const matches = pool.filter((r) => normalizePracticeDisplayName(r.name).toLowerCase() === key);
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => pinnedNameRowPreferenceScore(b) - pinnedNameRowPreferenceScore(a))[0]!;
}

/** Next Independent with on-domain Found email; excludes High Volume Saturation and rows that conflict with the current set. */
export function pickNextBestIndependentEmailForHomepageSample(
  pool: LeadPackCsvRow[],
  chosen: LeadPackCsvRow[]
): LeadPackCsvRow | null {
  const candidates = pool
    .filter((r) => !packRowConflictsWithSet(r, chosen))
    .filter((r) => !isExcludedHomepageSampleName(r))
    .filter((r) => isIndependentRow(r) && hasFoundEmailRow(r) && isOnDomainPrimaryRow(r))
    .filter((r) => !isLikelyDsoRow(r))
    .filter((r) => oppKey(r.opportunity_type) !== "high_volume_saturation")
    .sort((a, b) => {
      const ds = Number(b.score) - Number(a.score);
      if (ds !== 0) return ds;
      return priorityRank(a.priority) - priorityRank(b.priority);
    });
  return candidates[0] ?? null;
}

export function selectPinnedAustinHomepageSampleRows(
  data: LeadPackCsvRow[],
  names: readonly string[] = PINNED_AUSTIN_HOMEPAGE_SAMPLE_NAMES
): LeadPackCsvRow[] {
  const pool = data.filter((r) => !isLeadPackInstructionRow(r));
  const chosen: LeadPackCsvRow[] = [];
  const missing: string[] = [];
  for (const raw of names) {
    const row = pickBestRowForPinnedPracticeName(pool, raw);
    if (row) chosen.push(row);
    else missing.push(raw);
  }
  if (missing.length > 0) {
    throw new Error(
      `Pinned sample practice(s) not found in pack: ${missing.join(", ")}. ` +
        "Re-run pipeline or append missing leads before generating the homepage sample."
    );
  }
  return chosen;
}

/** Never showcase this practice on the homepage sample (bad Google website / phone). */
export function isExcludedHomepageSampleName(r: LeadPackCsvRow): boolean {
  const n = normalizePracticeDisplayName(r.name ?? "").toLowerCase();
  if (n === "dentist in austin") return true;
  return n.includes("austin modern dentistry");
}

function hasRealContactPageRow(r: LeadPackCsvRow): boolean {
  const form = r.contact_form_url?.trim();
  if (!form) return false;
  return isValidContactFormUrl(form, r.website);
}

function priorityRank(p: string | null | undefined): number {
  return ({ high: 0, medium: 1, low: 2 }[(p ?? "").toLowerCase()] ?? 3);
}

/** Row 1 / Top Lead: highest score among Independent + on-domain Found email (any opportunity type). */
export function pickTopLeadIndependentEmailRow(
  pool: LeadPackCsvRow[],
  chosen: LeadPackCsvRow[] = []
): LeadPackCsvRow | null {
  const candidates = pool
    .filter((r) => !packRowConflictsWithSet(r, chosen))
    .filter((r) => isIndependentRow(r) && hasFoundEmailRow(r))
    .sort((a, b) => {
      const ds = Number(b.score) - Number(a.score);
      if (ds !== 0) return ds;
      return priorityRank(a.priority) - priorityRank(b.priority);
    });
  return candidates[0] ?? null;
}

/** Best Independent Reputation Gap elsewhere in the pack: on-domain email, else contact form, else phone. */
export function pickIndependentReputationGapRow(
  pool: LeadPackCsvRow[],
  chosen: LeadPackCsvRow[]
): LeadPackCsvRow | null {
  const base = pool.filter((r) => !packRowConflictsWithSet(r, chosen) && !isExcludedHomepageSampleName(r));
  const sortRep = (list: LeadPackCsvRow[]) =>
    [...list].sort((a, b) => {
      const ds = Number(b.score) - Number(a.score);
      if (ds !== 0) return ds;
      return priorityRank(a.priority) - priorityRank(b.priority);
    });
  const email = sortRep(
    base.filter((r) => isIndependentRow(r) && oppKey(r.opportunity_type) === "reputation_gap" && hasFoundEmailRow(r))
  );
  if (email[0]) return email[0];
  const form = sortRep(
    base.filter(
      (r) => isIndependentRow(r) && oppKey(r.opportunity_type) === "reputation_gap" && isFormPrimaryRow(r)
    )
  );
  if (form[0]) return form[0];
  return null;
}

/** Replace weak rep-gap phone rows: Independent on-domain email, prefer Newer Unknown / General Growth + contact page. */
export function pickReplacementIndependentEmailLead(
  pool: LeadPackCsvRow[],
  chosen: LeadPackCsvRow[]
): LeadPackCsvRow | null {
  const base = pool
    .filter((r) => !packRowConflictsWithSet(r, chosen))
    .filter((r) => !isExcludedHomepageSampleName(r))
    .filter((r) => isIndependentRow(r) && hasFoundEmailRow(r));

  const scoreReplacement = (r: LeadPackCsvRow): number => {
    let s = Number(r.score) || 0;
    const ok = oppKey(r.opportunity_type);
    if (ok === "newer_unknown") s += 24;
    if (ok === "general_growth") s += 18;
    if (hasRealContactPageRow(r)) s += 14;
    return s;
  };

  const preferred = base
    .filter((r) => {
      const ok = oppKey(r.opportunity_type);
      return ok === "newer_unknown" || ok === "general_growth";
    })
    .sort((a, b) => scoreReplacement(b) - scoreReplacement(a));
  if (preferred[0]) return preferred[0];

  return [...base].sort((a, b) => scoreReplacement(b) - scoreReplacement(a))[0] ?? null;
}

function samplePool(data: LeadPackCsvRow[]): LeadPackCsvRow[] {
  return data.filter(
    (r) => !isLeadPackInstructionRow(r) && isSampleEligibleRow(r) && !isExcludedHomepageSampleName(r)
  );
}

function independentRepGapEmailOrFormInPool(pool: LeadPackCsvRow[]): boolean {
  return pool.some(
    (r) =>
      isIndependentRow(r) &&
      !isExcludedHomepageSampleName(r) &&
      oppKey(r.opportunity_type) === "reputation_gap" &&
      (hasFoundEmailRow(r) || isFormPrimaryRow(r))
  );
}

export function rowsConflict(a: LeadPackCsvRow, b: LeadPackCsvRow): boolean {
  const ak = normalizeAddressKey(a.address);
  const bk = normalizeAddressKey(b.address);
  if (ak && bk && ak === bk) return true;
  const fkA = formKey(a.contact_form_url);
  const fkB = formKey(b.contact_form_url);
  if (fkA && fkB && fkA === fkB) return true;
  const brA = brandKey(a.name, a.website);
  const brB = brandKey(b.name, b.website);
  if (brA && brB && brA === brB) return true;
  return false;
}

export function packRowConflictsWithSet(row: LeadPackCsvRow, chosen: LeadPackCsvRow[]): boolean {
  return chosen.some((c) => rowsConflict(row, c));
}

const REQUIRED_OPP = ["reputation_gap", "established_static", "newer_unknown"] as const;

function isFormPrimaryRow(r: LeadPackCsvRow): boolean {
  return Boolean(r.contact_form_url?.trim()) && !hasFoundEmailRow(r) && !isPhoneOnlyRow(r);
}

function scoreCandidate(r: LeadPackCsvRow, chosen: LeadPackCsvRow[]): number {
  let s = 0;
  if (hasFoundEmailRow(r)) s += 10;
  else if (isFormPrimaryRow(r)) s += 8;
  if (isPhoneOnlyRow(r)) s -= 12;
  const ok = oppKey(r.opportunity_type);
  if (ok === "high_volume_saturation" || ok === "general_growth") s -= 4;
  const p = (r.priority ?? "").toLowerCase();
  if (p === "medium") s += 6;
  if (p === "high") s += 5;
  if (p === "low") s += 2;
  const rating = Number(r.rating);
  const rc = Number(r.review_count);
  if (Number.isFinite(rating) && Number.isFinite(rc)) s += 3;
  if ((r.why_this_lead ?? "").toLowerCase().includes("unknown")) s -= 50;
  for (const c of chosen) {
    if (oppKey(c.opportunity_type) === ok && REQUIRED_OPP.includes(ok as (typeof REQUIRED_OPP)[number])) continue;
    if (oppKey(c.opportunity_type) === ok) s -= 3;
  }
  if (packRowConflictsWithSet(r, chosen)) return -999;
  return s;
}

function pickBest(
  pool: LeadPackCsvRow[],
  chosen: LeadPackCsvRow[],
  pred: (r: LeadPackCsvRow) => boolean
): LeadPackCsvRow | null {
  const candidates = pool
    .filter(pred)
    .filter((r) => !packRowConflictsWithSet(r, chosen))
    .sort((a, b) => scoreCandidate(b, chosen) - scoreCandidate(a, chosen));
  return candidates[0] ?? null;
}

function oppCount(chosen: LeadPackCsvRow[], key: string): number {
  return chosen.filter((c) => oppKey(c.opportunity_type) === key).length;
}

/**
 * Pick 10 showcase rows from a full lead pack (instruction row excluded).
 */
export function selectAustinHomepageSampleRows(data: LeadPackCsvRow[]): LeadPackCsvRow[] {
  const pool = samplePool(data);
  if (pool.length < 10) {
    throw new Error(`Need at least 10 eligible data rows; got ${pool.length}`);
  }

  const chosen: LeadPackCsvRow[] = [];
  const add = (r: LeadPackCsvRow | null) => {
    if (!r) throw new Error("Selection could not satisfy constraints");
    chosen.push(r);
  };

  add(pickTopLeadIndependentEmailRow(pool, chosen));
  add(pickIndependentReputationGapRow(pool, chosen) ?? pickReplacementIndependentEmailLead(pool, chosen));
  add(
    pickBest(
      pool,
      chosen,
      (r) =>
        oppKey(r.opportunity_type) === "established_static" &&
        hasFoundEmailRow(r) &&
        Number(r.score) >= 50
    )
  );
  add(
    pickBest(
      pool,
      chosen,
      (r) => oppKey(r.opportunity_type) === "newer_unknown" && (hasFoundEmailRow(r) || isFormPrimaryRow(r))
    )
  );

  for (let i = 0; i < 3; i += 1) {
    add(
      pickBest(
        pool,
        chosen,
        (r) =>
          hasFoundEmailRow(r) &&
          oppKey(r.opportunity_type) === "general_growth" &&
          Number(r.score) >= 52
      ) ??
        pickBest(
          pool,
          chosen,
          (r) =>
            hasFoundEmailRow(r) &&
            !["high_volume_saturation", "established_static", "newer_unknown", "reputation_gap"].includes(
              oppKey(r.opportunity_type)
            )
        ) ??
        pickBest(
          pool,
          chosen,
          (r) =>
            hasFoundEmailRow(r) &&
            oppCount(chosen, oppKey(r.opportunity_type)) < 2 &&
            !["high_volume_saturation"].includes(oppKey(r.opportunity_type))
        )
    );
  }

  for (let i = 0; i < 2; i += 1) {
    add(
      pickBest(
        pool,
        chosen,
        (r) =>
          isFormPrimaryRow(r) &&
          ["general_growth", "reputation_gap", "established_static"].includes(oppKey(r.opportunity_type)) &&
          oppCount(chosen, oppKey(r.opportunity_type)) === 0
      ) ??
        pickBest(
          pool,
          chosen,
          (r) => isFormPrimaryRow(r) && oppKey(r.opportunity_type) !== "newer_unknown"
        ) ??
        pickBest(pool, chosen, (r) => isFormPrimaryRow(r))
    );
  }

  add(
    pickBest(
      pool,
      chosen,
      (r) =>
        hasFoundEmailRow(r) &&
        (r.priority ?? "").toLowerCase() === "low" &&
        oppKey(r.opportunity_type) === "established_static" &&
        oppCount(chosen, "established_static") < 2
    ) ??
      pickBest(
        pool,
        chosen,
        (r) =>
          hasFoundEmailRow(r) &&
          (r.priority ?? "").toLowerCase() === "low" &&
          oppKey(r.opportunity_type) !== "high_volume_saturation"
      ) ??
      pickBest(pool, chosen, (r) => (r.priority ?? "").toLowerCase() === "low" && !isPhoneOnlyRow(r))
  );

  if (chosen.length !== 10) {
    throw new Error(`Selection produced ${chosen.length} rows, expected 10`);
  }

  const emails = chosen.filter(hasFoundEmailRow).length;
  const forms = chosen.filter(isFormPrimaryRow).length;
  const phoneOnly = chosen.filter(isPhoneOnlyRow).length;
  if (emails < 6) throw new Error(`Only ${emails} rows with found email; need at least 6`);
  if (forms < 2) throw new Error(`Only ${forms} contact-form rows; need at least 2`);
  if (phoneOnly > 1) throw new Error(`Too many phone-only rows: ${phoneOnly}`);

  const pri = new Set(chosen.map((r) => (r.priority ?? "").toLowerCase()));
  if (!pri.has("high") || pri.size < 2) {
    throw new Error(`Need mixed priorities; got ${Array.from(pri).join(", ")}`);
  }

  const requiredOpp = independentRepGapEmailOrFormInPool(pool)
    ? REQUIRED_OPP
    : (["established_static", "newer_unknown"] as const);
  for (const need of requiredOpp) {
    if (!chosen.some((r) => oppKey(r.opportunity_type) === need)) {
      throw new Error(`Missing required opportunity type: ${need}`);
    }
  }

  return chosen;
}

export type PackValidationResult = {
  ok: boolean;
  issues: string[];
  fixedCount: number;
};

function rowTextBlob(r: LeadPackCsvRow): string {
  return [
    r.why_this_lead,
    r.outreach_draft,
    r.reason,
    r.why_now,
    r.enrichment_notes,
    r.voicemail_script,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Pre-export checks aligned with lead-pack shipping rules. */
export function validateHomepageSamplePack(rows: LeadPackCsvRow[]): PackValidationResult {
  const issues: string[] = [];
  const data = rows.filter((r) => !isLeadPackInstructionRow(r));
  const blob = JSON.stringify(rows);

  if (/example\.com/i.test(blob)) issues.push("contains example.com");
  if (/555-0/i.test(blob)) issues.push("contains 555-0 placeholder phone");
  if (/  /.test(blob)) issues.push("contains double space");

  for (const r of data) {
    const text = rowTextBlob(r);
    if (/\bunknown\b/i.test(text)) issues.push(`"unknown" in copy for ${r.name}`);
    if (/about\s+stars/i.test(text) || /roughly\s+reviews/i.test(text)) {
      issues.push(`blank rating/review interpolation for ${r.name}`);
    }
    const es = (r.email_status ?? "").trim();
    if (!es) issues.push(`empty email_status for ${r.name}`);
    if (es.toLowerCase() === "pending") issues.push(`Pending email_status for ${r.name}`);
    if (!(r.why_this_lead ?? "").trim()) issues.push(`empty why_this_lead for ${r.name}`);
    if (!googleMapsUrlHasCid(r.maps_url)) {
      issues.push(`Maps URL missing cid for ${r.name}`);
    }
  }

  return { ok: issues.length === 0, issues, fixedCount: 0 };
}
