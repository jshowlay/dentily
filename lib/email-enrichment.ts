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
} from "@/lib/email-enrichment-config";
import {
  collectLikelyContactPageUrls,
  mergePageEmails,
  normalizeEmailCandidate,
  normalizeWebsiteUrl,
  pickBestEmail,
  type ScoredEmail,
  isPlaceholderEmail,
  isValidEmailShape,
} from "@/lib/email-enrichment-helpers";
import type { EmailStatus, Lead, LeadEnrichmentFields } from "@/lib/types";

export type { EmailEnrichmentRuntimeConfig };

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
};

export async function enrichLeadWebsite(
  input: EnrichLeadInput,
  config: EmailEnrichmentRuntimeConfig
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

  let fetchFailure: string | null = null;
  const home = await fetchHtml(baseUrlRaw, config);
  if (!home) {
    fetchFailure = "Homepage fetch failed after retries";
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

  const { best, alternates, rejectionReason } = pickBestEmail(allCandidates);
  if (best) {
    const notes =
      alternates.length > 0 ? `Alternate candidates: ${alternates.join(", ")}` : null;
    const fields: LeadEnrichmentFields = {
      primaryEmail: best.email,
      contactFormUrl: bestFormUrl,
      emailStatus: "found",
      emailSource: best.source,
      enrichmentNotes: notes,
      emailRejectionReason: null,
    };
    logEnrichmentLine({
      placeId: input.placeId,
      name: input.name,
      website: input.website,
      status: fields.emailStatus,
      primaryEmail: fields.primaryEmail,
      contactFormUrl: fields.contactFormUrl,
    });
    return fields;
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
    return fields;
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
    return fields;
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
    return fields;
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
    return fields;
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
  return fields;
}

/**
 * Runs enrichment with low concurrency, polite delays, and per-lead error isolation.
 * Order of `leads` is preserved. When disabled via env, returns skipped patches without HTTP.
 */
export async function batchEnrichLeads(leads: Lead[], runtime?: Partial<EmailEnrichmentRuntimeConfig>): Promise<Lead[]> {
  const config = { ...loadEmailEnrichmentConfig(), ...runtime };

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
  for (let i = 0; i < leads.length; i += config.concurrency) {
    const chunk = leads.slice(i, i + config.concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (lead, j) => {
        if (j > 0) await sleep(config.politeDelayMs);
        try {
          const patch = await enrichLeadWebsite(
            { placeId: lead.placeId, name: lead.name, website: lead.website },
            config
          );
          return { ...lead, ...patch };
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
  return out;
}
