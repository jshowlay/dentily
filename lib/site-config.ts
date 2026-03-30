/** Marketing CTAs and display constants — single source of truth for funnel copy. */

export const SITE = {
  /** Primary funnel CTA — landing, nav, pricing card, final CTA, search submit */
  primaryCta: "Build My Lead Pack",
  /** Secondary — scroll to product detail on landing */
  secondaryCta: "See what’s included",
  /** After search, when user still needs to pay */
  unlockCta: "Unlock opportunity pack ($49)",
  leadPackName: "Dentily Practice Opportunity Pack",
  leadPackPriceLabel: "$49",
  leadPackCount: 50,
  searchSubmitLoading: "Building your pack…",
  /** Shown under the submit button while the search API runs */
  searchSubmitWaitHint:
    "We pull live listings, score every practice, and draft outreach — usually 30–90 seconds. Keep this tab open.",
} as const;

/** Landing hero + search page headlines */
export const POSITIONING = {
  heroHeadline: "Close Your Next Dental Client Faster",
  heroSubheadline:
    "Dentily helps agencies, freelancers, and consultants find dental practices with clear growth gaps, prioritize the best opportunities, and start outreach with confidence.",
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
