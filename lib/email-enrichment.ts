/**
 * Website email + contact-form enrichment for practice leads (optional second pass).
 *
 * Does not block `/api/search`: leads are saved with `email_status: pending`, then
 * `POST /api/search/[id]/enrich` runs `batchEnrichLeads` with shallow limits from
 * `lib/email-enrichment-config.ts` (`backgroundEnrichmentOverrides`).
 */

import {
  type EmailEnrichmentRuntimeConfig,
  isEmailEnrichmentDisabled,
  loadEmailEnrichmentConfig,
  loadHunterFallbackConfig,
} from "@/lib/email-enrichment-config";
import { sanitizeContactFormUrlForExport } from "@/lib/contact-form-url";
import { enrichEmailFromDomain, extractDomain } from "@/lib/enrichment/hunter";
import { enrichEmail, type EnrichSource } from "@/lib/enrichEmail";
import { validateMarketingEmail } from "@/lib/marketing-email-validate";
import {
  collectLikelyContactPageUrls,
  mergePageEmails,
  normalizeEmailCandidate,
  normalizeWebsiteUrl,
  OFF_DOMAIN_PRIMARY_EMAIL_NOTE,
  pickBestEmail,
  type ScoredEmail,
  isPlaceholderEmail,
  isValidEmailShape,
} from "@/lib/email-enrichment-helpers";
import { emailMatchesWebsiteDomain } from "@/lib/url-normalize";
import { htmlMentionsSmileGeneration } from "@/lib/dso-listing-url";
import {
  discoverCorrectedPracticeWebsite,
  digitsOnlyPhone,
  formatWebsiteCorrectedNote,
} from "@/lib/website-discovery";
import type { EmailStatus, Lead, LeadEnrichmentFields } from "@/lib/types";

export type { EmailEnrichmentRuntimeConfig };

function gateContactFormUrl(
  website: string | null | undefined,
  formUrl: string | null | undefined
): string | null {
  return sanitizeContactFormUrlForExport(website, formUrl);
}

function mergeEnrichmentNotes(parts: Array<string | null | undefined>): string | null {
  const merged = parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return merged.length > 0 ? merged : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(
  url: string,
  config: EmailEnrichmentRuntimeConfig
): Promise<{ html: string; finalUrl: string } | null> {
  let lastError: string | null = null;
  for (let attempt = 0; attempt <= config.retryCount; attempt += 1) {
    if (attempt > 0) await sleep(250 * attempt);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": config.userAgent,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      clearTimeout(timer);
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
        lastError = `non-html content-type`;
        continue;
      }
      const html = await res.text();
      return { html, finalUrl: res.url || url };
    } catch (e) {
      clearTimeout(timer);
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return null;
}

function logEnrichmentLine(input: {
  placeId?: string;
  name: string;
  website: string | null;
  status: EmailStatus;
  primaryEmail: string | null;
  contactFormUrl: string | null;
  failureReason?: string | null;
}) {
  const id = input.placeId ?? "n/a";
  const email = input.primaryEmail ?? "—";
  const form = input.contactFormUrl ?? "—";
  const err = input.failureReason ? ` err=${input.failureReason}` : "";
  console.log(
    `[email-enrichment] placeId=${id} name=${JSON.stringify(input.name)} website=${JSON.stringify(
      input.website ?? ""
    )} status=${input.status} email=${email} contactForm=${form}${err}`
  );
}

export type EnrichLeadInput = {
  placeId?: string;
  name: string;
  website: string | null;
  address?: string | null;
  phone?: string | null;
};

type EnrichLeadOptions = {
  skipWebsiteDiscovery?: boolean;
};

function formatUsPhone10(digits10: string): string {
  if (digits10.length !== 10) return digits10;
  return `(${digits10.slice(0, 3)}) ${digits10.slice(3, 6)}-${digits10.slice(6)}`;
}

async function tryWebsiteDiscoveryPass(
  input: EnrichLeadInput,
  config: EmailEnrichmentRuntimeConfig,
  googleWebsite: string | null
): Promise<LeadEnrichmentFields | null> {
  if (!(input.address?.trim() || input.phone?.trim())) return null;

  const corrected = await discoverCorrectedPracticeWebsite({
    practiceName: input.name,
    address: input.address ?? null,
    phone: input.phone ?? null,
    googleWebsite,
    fetchHtml: (url) => fetchHtml(url, config),
  });
  if (!corrected) return null;

  const retry = await enrichLeadWebsite(
    { ...input, website: corrected.website },
    config,
    { skipWebsiteDiscovery: true }
  );

  const googleDigits = digitsOnlyPhone(input.phone);
  let phone: string | null = null;
  let phoneNote: string | null = null;
  if (corrected.phoneFromSite && corrected.phoneFromSite !== googleDigits) {
    phone = formatUsPhone10(corrected.phoneFromSite);
    phoneNote = `Site phone ${phone} differs from Google listing.`;
  }

  return {
    ...retry,
    website: corrected.website,
    phone,
    enrichmentNotes: mergeEnrichmentNotes([
      formatWebsiteCorrectedNote(googleWebsite),
      phoneNote,
      retry.enrichmentNotes,
    ]),
  };
}

export async function enrichLeadWebsite(
  input: EnrichLeadInput,
  config: EmailEnrichmentRuntimeConfig,
  options?: EnrichLeadOptions
): Promise<LeadEnrichmentFields> {
  const baseUrlRaw = normalizeWebsiteUrl(input.website);
  if (!baseUrlRaw) {
    const fields: LeadEnrichmentFields = {
      primaryEmail: null,
      contactFormUrl: null,
      emailStatus: "skipped",
      emailSource: null,
      enrichmentNotes: "No website available",
      emailRejectionReason: null,
    };
    logEnrichmentLine({
      placeId: input.placeId,
      name: input.name,
      website: input.website,
      status: fields.emailStatus,
      primaryEmail: null,
      contactFormUrl: null,
    });
    return fields;
  }

  const home = await fetchHtml(baseUrlRaw, config);
  if (!home) {
    if (!options?.skipWebsiteDiscovery) {
      const discovered = await tryWebsiteDiscoveryPass(input, config, input.website);
      if (discovered) {
        logEnrichmentLine({
          placeId: input.placeId,
          name: input.name,
          website: discovered.website ?? input.website,
          status: discovered.emailStatus,
          primaryEmail: discovered.primaryEmail,
          contactFormUrl: discovered.contactFormUrl,
        });
        return discovered;
      }
    }
    const fetchFailure = "Homepage fetch failed after retries";
    logEnrichmentLine({
      placeId: input.placeId,
      name: input.name,
      website: input.website,
      status: "not_found",
      primaryEmail: null,
      contactFormUrl: null,
      failureReason: fetchFailure,
    });
    return {
      primaryEmail: null,
      contactFormUrl: null,
      emailStatus: "not_found",
      emailSource: null,
      enrichmentNotes: fetchFailure,
      emailRejectionReason: null,
    };
  }

  const homepageMentionsSmileGeneration = htmlMentionsSmileGeneration(home.html);
  const withHomepageDso = (fields: LeadEnrichmentFields): LeadEnrichmentFields =>
    homepageMentionsSmileGeneration ? { ...fields, homepageMentionsSmileGeneration: true } : fields;

  const pageUrl = new URL(home.finalUrl);
  const { orderedCandidates: homeCandidates, contactFormUrl: homeForm } = mergePageEmails(
    home.html,
    pageUrl
  );
  const allCandidates: ScoredEmail[] = [...homeCandidates];
  let bestFormUrl = homeForm;

  const extraUrls = collectLikelyContactPageUrls(home.html, pageUrl, config.maxInternalPages);
  let visited = 0;
  for (const next of extraUrls) {
    if (visited >= config.maxInternalPages) break;
    await sleep(config.politeDelayMs);
    visited += 1;
    const sub = await fetchHtml(next, config);
    if (!sub) continue;
    const subUrl = new URL(sub.finalUrl);
    const { orderedCandidates: subCandidates, contactFormUrl: subForm } = mergePageEmails(
      sub.html,
      subUrl
    );
    for (const c of subCandidates) {
      let source = c.source;
      if (c.source !== "mailto") {
        if (/^\/contact/i.test(subUrl.pathname)) source = "contact_page";
        else if (/^\/about/i.test(subUrl.pathname) || /^\/team/i.test(subUrl.pathname)) {
          source = "about_page";
        }
      }
      allCandidates.push({ email: c.email, source });
    }
    if (subForm && !bestFormUrl) bestFormUrl = subForm;
  }

  bestFormUrl = gateContactFormUrl(input.website, bestFormUrl);

  const { best, alternates, rejectionReason, domainMismatchWarning } = pickBestEmail(
    allCandidates,
    input.website
  );
  if (best) {
    const exportAlternates =
      emailMatchesWebsiteDomain(best.email, input.website)
        ? alternates.filter((e) => emailMatchesWebsiteDomain(e, input.website))
        : alternates;
    const notes = mergeEnrichmentNotes([
      exportAlternates.length > 0 ? `Alternate candidates: ${exportAlternates.join(", ")}` : null,
      domainMismatchWarning ? OFF_DOMAIN_PRIMARY_EMAIL_NOTE : null,
    ]);
    const fields: LeadEnrichmentFields = {
      primaryEmail: best.email,
      contactFormUrl: bestFormUrl,
      emailStatus: "found",
      emailSource: best.source,
      enrichmentNotes: notes,
      emailRejectionReason: null,
      homepageMentionsSmileGeneration,
    };
    logEnrichmentLine({
      placeId: input.placeId,
      name: input.name,
      website: input.website,
      status: fields.emailStatus,
      primaryEmail: fields.primaryEmail,
      contactFormUrl: fields.contactFormUrl,
    });
    return withHomepageDso(fields);
  }

  if (rejectionReason && allCandidates.length > 0) {
    const fields: LeadEnrichmentFields = {
      primaryEmail: null,
      contactFormUrl: bestFormUrl,
      emailStatus: bestFormUrl ? "contact_form_only" : "invalid",
      emailSource: null,
      enrichmentNotes: bestFormUrl
        ? null
        : `No mailbox passed validation: ${rejectionReason}`,
      emailRejectionReason: rejectionReason,
    };
    logEnrichmentLine({
      placeId: input.placeId,
      name: input.name,
      website: input.website,
      status: fields.emailStatus,
      primaryEmail: null,
      contactFormUrl: fields.contactFormUrl,
      failureReason: rejectionReason,
    });
    return withHomepageDso(fields);
  }

  const normalized = allCandidates
    .map((c) => normalizeEmailCandidate(c.email))
    .filter((n): n is string => Boolean(n));
  const malformed = normalized.some((n) => !isValidEmailShape(n));
  if (malformed) {
    const fields: LeadEnrichmentFields = {
      primaryEmail: null,
      contactFormUrl: bestFormUrl,
      emailStatus: "invalid",
      emailSource: null,
      enrichmentNotes: "Malformed email candidate discarded",
      emailRejectionReason: "malformed_candidate",
    };
    logEnrichmentLine({
      placeId: input.placeId,
      name: input.name,
      website: input.website,
      status: fields.emailStatus,
      primaryEmail: null,
      contactFormUrl: fields.contactFormUrl,
      failureReason: fields.enrichmentNotes,
    });
    return withHomepageDso(fields);
  }

  if (normalized.length > 0 && normalized.every((n) => isPlaceholderEmail(n))) {
    const fields: LeadEnrichmentFields = {
      primaryEmail: null,
      contactFormUrl: bestFormUrl,
      emailStatus: bestFormUrl ? "contact_form_only" : "not_found",
      emailSource: null,
      enrichmentNotes: bestFormUrl ? null : "Only placeholder-style addresses found",
      emailRejectionReason: null,
    };
    logEnrichmentLine({
      placeId: input.placeId,
      name: input.name,
      website: input.website,
      status: fields.emailStatus,
      primaryEmail: null,
      contactFormUrl: fields.contactFormUrl,
    });
    return withHomepageDso(fields);
  }

  if (bestFormUrl) {
    const fields: LeadEnrichmentFields = {
      primaryEmail: null,
      contactFormUrl: bestFormUrl,
      emailStatus: "contact_form_only",
      emailSource: null,
      enrichmentNotes: null,
      emailRejectionReason: null,
    };
    logEnrichmentLine({
      placeId: input.placeId,
      name: input.name,
      website: input.website,
      status: fields.emailStatus,
      primaryEmail: null,
      contactFormUrl: bestFormUrl,
    });
    return withHomepageDso(fields);
  }

  if (!options?.skipWebsiteDiscovery) {
    const discovered = await tryWebsiteDiscoveryPass(input, config, input.website);
    if (discovered) {
      logEnrichmentLine({
        placeId: input.placeId,
        name: input.name,
        website: discovered.website ?? input.website,
        status: discovered.emailStatus,
        primaryEmail: discovered.primaryEmail,
        contactFormUrl: discovered.contactFormUrl,
      });
      return discovered;
    }
  }

  const fields: LeadEnrichmentFields = {
    primaryEmail: null,
    contactFormUrl: null,
    emailStatus: "not_found",
    emailSource: null,
    enrichmentNotes: null,
    emailRejectionReason: null,
  };
  logEnrichmentLine({
    placeId: input.placeId,
    name: input.name,
    website: input.website,
    status: fields.emailStatus,
    primaryEmail: null,
    contactFormUrl: null,
  });
  return withHomepageDso(fields);
}

function mergeEnrichmentOntoLead(lead: Lead, patch: LeadEnrichmentFields): Lead {
  const intel = (lead.metadata?.intelligence ?? {}) as Record<string, unknown>;
  const metadata =
    patch.homepageMentionsSmileGeneration
      ? {
          ...lead.metadata,
          intelligence: { ...intel, homepageMentionsSmileGeneration: true },
        }
      : lead.metadata;
  return {
    ...lead,
    ...patch,
    website: patch.website ?? lead.website,
    phone: patch.phone ?? lead.phone,
    metadata,
  };
}

/**
 * Runs enrichment with low concurrency, polite delays, and per-lead error isolation.
 * Order of `leads` is preserved. When disabled via env, returns skipped patches without HTTP.
 */
export async function batchEnrichLeads(
  leads: Lead[],
  runtime?: Partial<EmailEnrichmentRuntimeConfig>,
  options?: { hunterFallback?: boolean; skipWebsiteDiscovery?: boolean }
): Promise<Lead[]> {
  const config = { ...loadEmailEnrichmentConfig(), ...runtime };
  const runHunter = options?.hunterFallback ?? true;
  const skipWebsiteDiscovery = options?.skipWebsiteDiscovery ?? false;

  if (isEmailEnrichmentDisabled()) {
    console.log("[email-enrichment] batch skipped: DENTILY_DISABLE_EMAIL_ENRICHMENT is set");
    return leads.map((lead) => ({
      ...lead,
      primaryEmail: null,
      contactFormUrl: null,
      emailStatus: "skipped",
      emailSource: null,
      enrichmentNotes: "Enrichment disabled via DENTILY_DISABLE_EMAIL_ENRICHMENT",
      emailRejectionReason: null,
    }));
  }

  const out: Lead[] = [];
  const websiteCorrected: Array<{ name: string; from: string; to: string; email: string | null }> =
    [];
  for (let i = 0; i < leads.length; i += config.concurrency) {
    const chunk = leads.slice(i, i + config.concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (lead, j) => {
        if (j > 0) await sleep(config.politeDelayMs);
        try {
          const patch = await enrichLeadWebsite(
            {
              placeId: lead.placeId,
              name: lead.name,
              website: lead.website,
              address: lead.address,
              phone: lead.phone,
            },
            config,
            skipWebsiteDiscovery ? { skipWebsiteDiscovery: true } : undefined
          );
          if (
            patch.website &&
            patch.enrichmentNotes?.includes("Website corrected") &&
            patch.website !== lead.website
          ) {
            websiteCorrected.push({
              name: lead.name,
              from: lead.website ?? "",
              to: patch.website,
              email: patch.primaryEmail,
            });
          }
          return mergeEnrichmentOntoLead(lead, patch);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[email-enrichment] lead failed", {
            placeId: lead.placeId,
            name: lead.name,
            error: msg,
          });
          logEnrichmentLine({
            placeId: lead.placeId,
            name: lead.name,
            website: lead.website,
            status: "not_found",
            primaryEmail: null,
            contactFormUrl: null,
            failureReason: msg,
          });
          return {
            ...lead,
            primaryEmail: null,
            contactFormUrl: null,
            emailStatus: "not_found" as const,
            emailSource: null,
            enrichmentNotes: `Enrichment error: ${msg}`,
            emailRejectionReason: null,
          };
        }
      })
    );
    out.push(...chunkResults);
    if (i + config.concurrency < leads.length) {
      await sleep(config.politeDelayMs);
    }
  }
  console.log(
    `[email-enrichment] website_corrected_count=${websiteCorrected.length}`,
    websiteCorrected.slice(0, 20)
  );
  const enriched = runHunter ? await runHunterFallback(out) : out;
  return enriched;
}

/**
 * Second pass: for leads the website crawl could not resolve to an email but that
 * have a website, query Hunter.io Domain Search. Runs sequentially with a delay
 * and a hard per-search cap to respect Hunter's quota/rate limits.
 */
export async function runHunterFallback(leads: Lead[]): Promise<Lead[]> {
  const hunter = loadHunterFallbackConfig();
  if (!hunter.enabled) return leads;

  const candidates = leads.filter(
    (l) => !(l.primaryEmail ?? "").trim() && (l.website ?? "").trim()
  );
  if (candidates.length === 0) return leads;

  const targets = new Set(candidates.slice(0, hunter.maxLookupsPerSearch).map((l) => l.placeId));
  console.log(
    `[hunter] fallback candidates=${candidates.length} attempting=${targets.size} cap=${hunter.maxLookupsPerSearch}`
  );

  const patched = new Map<string, Lead>();
  let found = 0;
  let first = true;
  for (const lead of leads) {
    if (!targets.has(lead.placeId)) continue;
    if (!first) await sleep(hunter.delayMs);
    first = false;

    try {
      const result = await enrichEmailFromDomain(lead.website as string);
      if (result.email) {
        found += 1;
        const confidenceNote =
          result.confidence !== null ? ` (confidence ${result.confidence})` : "";
        patched.set(lead.placeId, {
          ...lead,
          primaryEmail: result.email,
          emailStatus: "found",
          emailSource: "hunter",
          enrichmentNotes: `Found via Hunter.io domain search${confidenceNote}`,
          emailRejectionReason: null,
        });
        logEnrichmentLine({
          placeId: lead.placeId,
          name: lead.name,
          website: lead.website,
          status: "found",
          primaryEmail: result.email,
          contactFormUrl: lead.contactFormUrl,
        });
      }
    } catch (e) {
      console.error("[hunter] fallback lead failed", {
        placeId: lead.placeId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  console.log(`[hunter] fallback found=${found}/${targets.size}`);
  if (patched.size === 0) return leads;
  return leads.map((l) => patched.get(l.placeId) ?? l);
}

const DEEP_SOURCE_LABEL: Record<EnrichSource, string> = {
  website_crawl: "deep website crawl",
  pattern_guess: "verified common-pattern guess",
  apollo: "Apollo people search",
  npi_prospeo: "NPI registry + Prospeo",
};

/**
 * Final pass: for leads still without an email after the website crawl + Hunter,
 * run the multi-tier `enrichEmail` pipeline (deep crawl → ZeroBounce pattern guess
 * → Apollo → NPI/Prospeo). Results are re-validated against the marketing-email
 * gate (so they match what the CSV export will accept) before being patched in.
 *
 * Order is preserved. Bounded by a per-search cap and skippable via
 * `DENTILY_DISABLE_DEEP_ENRICH`.
 */
export async function runDeepEnrichment(
  leads: Lead[],
  location: { city: string; state: string },
  options?: { paidProviders?: boolean }
): Promise<Lead[]> {
  if (process.env.DENTILY_DISABLE_DEEP_ENRICH) return leads;
  const paidProviders = options?.paidProviders !== false;
  const max = Number.parseInt(process.env.DENTILY_DEEP_ENRICH_MAX ?? "50", 10) || 50;

  const candidates = leads.filter(
    (l) => !(l.primaryEmail ?? "").trim() && (l.website ?? "").trim()
  );
  if (candidates.length === 0) return leads;

  const targets = new Set(candidates.slice(0, max).map((l) => l.placeId));
  console.log(
    `[deep-enrich] candidates=${candidates.length} attempting=${targets.size} cap=${max}`
  );

  const patched = new Map<string, Lead>();
  let found = 0;
  for (const lead of leads) {
    if (!targets.has(lead.placeId)) continue;
    const domain = extractDomain(lead.website);
    if (!domain) continue;

    try {
      const result = await enrichEmail(
        {
          domain,
          practice_name: lead.name,
          city: location.city,
          state: location.state,
        },
        { paidProviders }
      );
      if (!result.email || !result.source) continue;

      const validation = validateMarketingEmail(result.email);
      if (!validation.ok) {
        console.warn(
          `[deep-enrich] domain=${domain} rejected ${result.email}: ${validation.reason}`
        );
        continue;
      }

      found += 1;
      const verifiedNote = result.verified ? " (verified)" : "";
      const confidenceNote = result.confidence ? ` — ${result.confidence} confidence` : "";
      patched.set(lead.placeId, {
        ...lead,
        primaryEmail: validation.normalized,
        emailStatus: "found",
        emailSource: result.source,
        enrichmentNotes: `Found via ${DEEP_SOURCE_LABEL[result.source]}${verifiedNote}${confidenceNote}`,
        emailRejectionReason: null,
      });
      logEnrichmentLine({
        placeId: lead.placeId,
        name: lead.name,
        website: lead.website,
        status: "found",
        primaryEmail: validation.normalized,
        contactFormUrl: lead.contactFormUrl,
      });
    } catch (e) {
      console.error("[deep-enrich] lead failed", {
        placeId: lead.placeId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  console.log(`[deep-enrich] found=${found}/${targets.size}`);
  if (patched.size === 0) return leads;
  return leads.map((l) => patched.get(l.placeId) ?? l);
}
