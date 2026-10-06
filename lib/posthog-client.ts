import posthog from "posthog-js";

/** Must match Vercel / .env.local (inlined at build time for client bundles). */
export const POSTHOG_PROJECT_TOKEN_ENV = "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";

let initialized = false;

export function getPostHogProjectToken(): string {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ||
    ""
  );
}

export function getPostHogApiHost(): string {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_API_HOST?.trim() ||
    "https://us.i.posthog.com"
  );
}

/** Client-only PostHog init; no-ops when project token is unset. */
export function initPostHogClient(): typeof posthog | null {
  if (typeof window === "undefined") return null;

  const token = getPostHogProjectToken();
  if (!token) {
    console.warn(
      `[PostHog] ${POSTHOG_PROJECT_TOKEN_ENV} is not set in the client bundle. ` +
        "Add it in Vercel env vars and redeploy (NEXT_PUBLIC_* is baked in at build time)."
    );
    return null;
  }

  if (!initialized) {
    posthog.init(token, {
      api_host: getPostHogApiHost(),
      person_profiles: "identified_only",
      capture_pageview: false,
    });
    initialized = true;
    console.info("[PostHog] initialized", {
      api_host: getPostHogApiHost(),
      token_prefix: `${token.slice(0, 8)}…`,
    });
  }

  return posthog;
}

export { posthog };
