import posthog from "posthog-js";

let initialized = false;

/** Client-only PostHog init; no-ops when project token is unset (local dev). */
export function initPostHogClient(): typeof posthog | null {
  if (typeof window === "undefined") return null;
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  if (!token) return null;
  if (!initialized) {
    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
    });
    initialized = true;
  }
  return posthog;
}

export { posthog };
