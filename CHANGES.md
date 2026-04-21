# Dentily lead pipeline — what changed (April 2026)

This note is for you, not for a code review. It explains what was wrong with the Austin-style CSV output and what we changed at the source.

## Pre-launch polish

**What changed**

1. **`Action Tier` + column order** — `lib/lead-pack-export.ts` adds **Action Tier** (`Tier 1: Ready to Contact` / `Tier 2: Call First` / `Tier 3: Research Required`) from the same gated email, vetted contact form, and phone fields buyers already trust, and moves **Priority** next to **Name** so sorted sheets surface intent and next step immediately.
2. **`Why This Lead` + contact-form domain sanity** — One short sentence per row from **Opportunity Type**, **Rating**, **Review Count**, and **Priority** (no new signals). Contact form URLs are cleared when the form host’s registrable domain does not match the practice **Website** and does not reflect the practice name, fixing bad scrapes such as unrelated storefront domains.

## Launch-ready patch

**What changed**

1. **Buyer placeholders in CSV drafts** — `lib/marcus-outreach.ts` no longer injects a fabricated sender. Written outreach uses `{{your_name}}`, `{{your_company}}`, and `{{your_credibility_line}}`, plus an em-dash sign-off line. Buyers replace once and ship; this matches the $49 pack positioning.
2. **Instruction row** — `lib/lead-pack-export.ts` prepends a non-lead CSV row (`Name` = `--- HOW TO USE THIS PACK ---`) with the exact pack-usage copy in the outreach column so spreadsheets explain replacements before any data rows.
3. **City parsing** — `lib/parse-city-from-address.ts` treats the **second** comma segment as the city (fixes `Street, City, ST ZIP, Country` where the old “second-to-last segment” became `FL 33130`). Archetype copy uses that city or **In most markets**; tests reject `In ST ZIP` style fragments.
4. **Column rename + placeholders audit** — CSV header **Outreach** → **Outreach Draft (customize before sending)**. New trailing columns **Placeholders Remaining** (comma-separated tags still in the draft) and **Apollo Enrichment** (stub, blank until Apollo ships). `lib/outreach-placeholders.ts` centralizes tag detection.
5. **Apollo stub** — `lib/apollo-stub.ts` (called from export) and `enrichment/apollo_stub.py` (stdlib, for future Python offline parity) return the null shape today so wiring stays one line when an API key exists.
6. **Public Austin sample CSV** — `lib/austin-sample-pack-rows.ts` + `npm run generate-sample-pack` write `public/sample/dentily-sample-pack-austin.csv` for homepage download links. Rows use **verifiable** practice names, addresses, and phones from public location pages; rating/review_count only where cited (Forest Family Anderson: public Yelp summary).
7. **Pipeline stdout summary** — After each `buildLeadPackRowsFromExport`, the console logs email valid/rejected counts, forms, phone-only rows, cluster groups, and priority distribution (operator visibility without opening the CSV).
8. **Email `www.`** — Already in `lib/marketing-email-validate.ts`; retained with fixture `info@www.trudentistryaustin.com` → `info@trudentistryaustin.com`.

**Rationale in one line each:** remove fake persona friction; make drafts obviously customizable; stop ZIP tokens masquerading as cities; label columns so buyers do not paste placeholders; reserve Apollo column for upsell; ship a real downloadable sample; log batch health; keep mailbox normalization strict.

## Follow-up patch #2

**What changed**

1. **Variant pool** — `lib/marcus-outreach.ts` now picks **credibility**, **body**, and **CTA** with **separate** deterministic hashes (`practice name + archetype + cred|body|cta`). There are **five** proof lines in `MARCUS_PERSONA.proofVariants` (`lib/lead-pipeline-config.ts`), **five** body lines per outreach archetype, and **three** CTAs per archetype (75 combinations per archetype). CTAs only ask for a reply of **Loom**, **yes**, or **send it**, and each states a **2-minute Loom** asset. Copy stays defensible from public fields only (rating, review count, city from address, website URL presence). **Reputation gap** and **established static** avoid compliment-led openers after the proof line.
2. **Email `www.` host** — `lib/marketing-email-validate.ts` strips a leading **`www.`** label from the domain, then runs the same checks on the rebuilt address (e.g. `info@www.trudentistryaustin.com` → `info@trudentistryaustin.com`).
3. **Reachability vs priority score** — **`SCORING_WEIGHTS.reachability`** is **0** in `lib/lead-pipeline-config.ts`. **`computeBaseScore`** (`lib/dentist-scoring.ts`) is **Fit + Opportunity** only (plus the existing small adjustments). **Reachability** remains **Reachability Score** on the CSV and is used as a **sort tiebreaker** after priority and score in **`lib/lead-pack-export.ts`** (`sortByPriorityThenScore`). That way easy contact paths do not inflate **Priority** buckets; they only help ordering among similar scores.

**Why Reachability was demoted**

Enrichment filled email and forms for more rows, which pushed **Reachability** into the old blended score and ballooned **Medium** priority. Reachability is operational convenience for the sender, not proof of opportunity, so it must not move the priority band.

## Follow-up patch (shipping blockers)

**What changed**

1. **Credibility lines** — `MARCUS_PERSONA.proofVariants` in `lib/lead-pipeline-config.ts` are all first-person past tense so they read correctly after `I am Marcus Ellery from Ellery Practice Growth.`
2. **Reputation geography** — `lib/marcus-outreach.ts` uses `parseCityFromAddress` (`lib/parse-city-from-address.ts`) for `In {city} that…`, with **In most markets** when parsing fails (no hardcoded Austin).
3. **Unverifiable claims** — Established-static copy with a site no longer asserts template quality or brand-defense ads; both are **question-style** lines. Tests forbid the old exact phrases unless we later add signal columns (not added here).
4. **Mailbox hygiene** — `lib/marketing-email-validate.ts` centralizes strict checks (TLD glues, script/vendor tokens, digit/phone artifacts, parseaddr-style gate). Enrichment uses it in `pickBestEmail`; export runs **`sanitizeExportRowForEmailGate`** in `lib/lead-pack-export.ts` so garbage never lands in **Primary Email**, **Best Contact Method** downgrades correctly, and **`Email Rejection Reason`** is a CSV column. **`lib/db.ts`** / **`db/schema.sql`** include `email_rejection_reason` on leads; **`lib/export-lead-adapter.ts`** maps it onto `Lead`.
5. **Tests** — `lib/shipping-blockers.test.ts`, `lib/marketing-email-validate.test.ts`, shared rows in `lib/lead-pipeline-fixtures.ts`.

**What did not change**

Scoring weights, archetype thresholds, enrichment fetch sources, and CSV column ordering aside from inserting **Email Rejection Reason** after **Enrichment Notes**.

**Noticed but did not fix**

`fixtures/dentily-austin-dental-leads-92.csv` still carries older **Outreach** text in-column (offline / Python input only). The TypeScript export path and `dentily-austin-dental-leads-fixed.csv` are the regenerated source of truth.

## Path we took

**We fixed the existing TypeScript generator** (the same code path that powers `/api/search` and paid CSV export). There was **no** `dentily-austin-dental-leads-92.csv` in the repo when we started, so we added:

- `lib/lead-pipeline.test.ts` with sample rows (including the **Frontier Trail** shared address case),
- `dentily-austin-dental-leads-fixed.csv` at the repo root (generated with `WRITE_FIXED_CSV=1 npm test`),
- `fixtures/dentily-austin-dental-leads-92.csv` as a copy you can use as input for the offline script.

We also added **`scripts/generate_leads.py`** (stdlib `csv` only, no pandas required) for lightweight offline passes on any exported CSV: cluster notes, sentence dedupe in `Outreach`, and optional fill for reachability / voicemail columns. **Full** rescoring and Marcus outreach regeneration happen in **TypeScript** on export.

## Objections addressed

### 1. Duplicated sentences in outreach

**Cause:** `personalizeDentistOutreachWithSignals` prepended a rating + review hook even when the model (or fallback) already mentioned reviews, so you could get “170 reviews” twice.

**Fix:** That path now runs through **`finalizeMarcusOutreach`**, which strips long dashes, dedupes whole sentences, and rebuilds from **`buildMarcusWrittenOutreach`** when duplication or missing identity is detected. **`lib/outreach-text.ts`** holds the sentence + 5-word span helpers; tests assert no duplicate 5-word spans.

### 2. Same mail-merge for every lead

**Fix:** **`lib/marcus-outreach.ts`** picks an **archetype** from rating/reviews/website (reputation gap, established/static, high-volume saturation, newer/unknown, general). Each archetype uses **rotating** opener / observation / CTA lines chosen deterministically from a **hash of the practice name**, so the list varies but a given practice stays stable.

### 3. Vague CTA

**Fix:** CTAs spell out **what** you send (a short Loom), **how long** it takes, and the **exact reply token** (`Reply Loom`, `Reply yes`, or `Reply send it`), varied by archetype (see **Follow-up patch #2** for the expanded pool).

### 4. Scoring looked arbitrary (5.0 / 288 vs 5.0 / 172)

**Fix:** **`lib/dentist-scoring.ts`** uses a **weighted blend** of **Fit** and **Opportunity** (0–100 each) for the exported **Score** and **Priority** bands, with weights and thresholds in **`lib/lead-pipeline-config.ts`**. **Reachability** is not blended into that score; see **Follow-up patch #2**. We **removed** the old “always promote 5 highs” behavior in **`app/api/search/route.ts`** so priority labels match the numbers.

### 5. Generic “Why Now”

**Fix:** **`computeWhyNow`** in **`lib/lead-pack-export.ts`** only returns text when there is a **real trigger** from fields we already have (no site, very low rating, very thin reviews). Otherwise it returns **blank**. A short code comment lists future trigger ideas (velocity, hiring, permits, ad transparency).

### 6. Hidden enrichment gaps

**Fix:** Export adds **`Reachability Score`** (0–3) and sets **`Contactable`** to **`Yes`**, **`Gatekeeper only`**, or **`No`** based on email/form/phone, not optimism.

### 7. Duplicate addresses

**Fix:** Export runs an **address cluster** pass (normalized street, suite tokens stripped). Co-located rows get **`Cluster Notes`**, and every row in the cluster except the **top scorer** is **demoted** (priority low, score capped) so you do not double-contact the same suite.

### 8. Phone vs email tone mismatch

**Fix:** **`Best Contact Method`** is **`Phone (no digital path)`** when only a phone exists, and a separate **`Voicemail Script`** column holds a **15-second style** script. Written **`Outreach`** stays in email/form voice.

### 9. No sender persona

**Fix:** **`lib/lead-pipeline-config.ts`** centralizes **Marcus Ellery / Ellery Practice Growth** plus rotating proof lines. All generated outreach ends with **`- Marcus`** (ASCII hyphen, not a long dash). Prompts in **`lib/score-lead.ts`** tell the model the same constraints (no “leverage / solutions / partner”, no em dashes).

## Files you may care about

| Area | File |
|------|------|
| Persona + weights + thresholds | `lib/lead-pipeline-config.ts` |
| Scoring + export reason line | `lib/dentist-scoring.ts` |
| Marcus templates + archetypes | `lib/marcus-outreach.ts` |
| Dedupe / dash stripping | `lib/outreach-text.ts` |
| Export row → Lead | `lib/export-lead-adapter.ts` |
| CSV pipeline (why now, cluster, columns) | `lib/lead-pack-export.ts` |
| AI prompts + fallbacks | `lib/score-lead.ts` |
| Thin wrapper | `lib/dentist-outreach.ts` |
| No artificial “5 highs” promotion | `app/api/search/route.ts` |
| Export route | `app/api/search/[searchId]/export/route.ts` |
| Tests | `lib/lead-pipeline.test.ts`, `lib/shipping-blockers.test.ts`, `lib/marketing-email-validate.test.ts` |
| Sample export rows (shared) | `lib/lead-pipeline-fixtures.ts` |
| Offline helper | `scripts/generate_leads.py` |

## Regenerating `dentily-austin-dental-leads-fixed.csv`

From repo root:

```bash
WRITE_FIXED_CSV=1 npm test
```

That overwrites **`dentily-austin-dental-leads-fixed.csv`** using the in-repo sample rows from **`lib/lead-pipeline-fixtures.ts`**.

## Next steps (not built)

- **Site quality signal** — Heuristic homepage pass (builder fingerprints, stock vs custom photo hints, word count) with a **`Site Quality Signal`** column before any “template catalog” style claim ships.
- **Branded SERP / Ads** — Real check (e.g. Transparency Center or SERP scrape) before asserting anything about brand-defense search.
- Pull **Google Ads Transparency** or similar if you want “running ads on brand name” as a real signal instead of a rhetorical example.
- **Review velocity** (week-over-week) needs time-series storage; we only snapshot today’s rating/review count.
- If you want **Python** to match TypeScript scoring exactly, port the numeric helpers from `lib/dentist-scoring.ts` into `scripts/generate_leads.py` and keep the two in sync (or call a small Node worker).
