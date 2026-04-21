/**
 * Single place to tweak persona, scoring, and priority bands without hunting the codebase.
 * Python `scripts/generate_leads.py` duplicates numeric policy for offline CSV repair. Keep in sync.
 */

export const MARCUS_PERSONA = {
  firstName: "Marcus",
  lastName: "Ellery",
  business: "Ellery Practice Growth",
  positioning:
    "Solo operator, not an agency. Works with 6 dental practices at a time on new-patient acquisition. Only takes a practice when he can point to the specific gap he would fix.",
  proofVariants: [
    "Before this I spent 14 months running Google Ads for a 4-location DSO in Dallas. I held booked new-patient cost near $38.",
    "I previously ran paid acquisition for a Dallas DSO across four locations. Cost-per-booked-new-patient stayed around $38 over 14 months.",
    "My last role was paid acquisition for a 4-location Dallas DSO. I kept cost-per-booked-new-patient near $38 for 14 months.",
    "I ran paid search for a four-location Dallas DSO for 14 months. Booked new patients from those ads landed near $38 each.",
    "My Dallas DSO stint was four clinics wide. I kept Google booked-new-patient cost near $38 for about 14 months.",
  ] as const,
  signOff: "Marcus",
  bannedWords: /\b(leverage|solutions?|partner(?:ing)?)\b/gi,
} as const;

/** Final score bands after weighted components (before optional cluster demotion on export). */
export const PRIORITY_SCORE_HIGH_MIN = 58;
export const PRIORITY_SCORE_MEDIUM_MIN = 42;

/**
 * Weights for the **priority score** (Fit + Opportunity only, renormalized from the former 0.34/0.46/0.2 split).
 * Reachability is **not** blended into this number. It still appears as **Reachability Score** on export and is used
 * only as a **sort tiebreaker** after priority and score (`lib/lead-pack-export.ts`).
 */
export const SCORING_WEIGHTS = {
  fit: 0.425,
  opportunity: 0.575,
  /** Kept at 0 for the combined priority score. Email/form/phone stay in the CSV reachability column + sort tiebreak. */
  reachability: 0,
} as const;

/** Rating above this is treated as strong public proof (opportunity shifts away from "reputation repair"). */
export const RATING_STRONG = 4.75;

/** Review counts at or above this use the saturation / non-growth-pitch archetype. */
export const REVIEW_SATURATION = 1000;
