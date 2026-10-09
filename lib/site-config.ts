/** Marketing CTAs and display constants — single source of truth for funnel copy. */

export const SITE = {
  /** Primary funnel CTA — landing, nav, pricing card, search submit */
  primaryCta: "Get Leads Now",
  /** Secondary — scroll to proof / sample on landing */
  secondaryCta: "View Sample Leads",
  /** After search, when user still needs to pay */
  unlockCta: "Unlock opportunity pack ($99)",
  leadPackName: "Dentily Practice Opportunity Pack",
  leadPackPriceLabel: "$99",
  leadPackCount: 150,
  searchSubmitLoading: "Building your pack…",
  /** Shown under the submit button while the search API runs */
  searchSubmitWaitHint:
    "We pull live listings, score every practice, and draft outreach — usually 30–90 seconds. Keep this tab open.",
} as const;

/** Landing hero + search page headlines */
export const POSITIONING = {
  heroHeadline: "Stop Guessing. Start Closing Dental Clients.",
  heroSubheadline:
    "Dentily shows you exactly which dental practices are ready to grow — and what to say to win them.",
  heroSupportLine:
    "Each lead pack includes scored practices, best available contact paths, opportunity insight, and ready-to-use outreach messaging.",
  heroMicrocopy:
    "One-time pack. Review on screen before you pay. Built for people who sell services to dental practices.",
  searchHeadline: "Pick your territory",
  searchSubheadline:
    "Tell us where you want opportunities — we surface scored practices, contact paths, and outreach you can use today.",
} as const;

export const HOW_TO_USE_PACK_STEPS: readonly string[] = [
  "Open your results table and sort by priority and score.",
  "Start with High-priority practices and adapt the included outreach drafts.",
  "Reach out through your normal B2B or partnership process — calls, email, or field visits.",
  "Track responses and run another search when you want a fresh territory.",
];

/** Plain-English quality note — manual review; not an automated guarantee. */
export const QUALITY_REPLACEMENT_NOTE =
  "If a purchased pack is materially unusable due to widespread bad or missing records, contact support — we can review and, at our discretion, offer a replacement or credit. Not a substitute for legal advice or a formal SLA.";

/** Contact-path satisfaction guarantee — same wording on FAQ, pricing, results, and Quick Start PDF. */
export const PACK_CONTACT_SATISFACTION_GUARANTEE =
  "If fewer than half the practices in your pack have a way to contact them (email, contact form, or phone), email hello@dentily.co and we'll refund you in full.";
