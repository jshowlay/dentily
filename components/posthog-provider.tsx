"use client";

import { Suspense, useLayoutEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PostHogProvider } from "posthog-js/react";
import { getPostHogProjectToken, initPostHogClient, posthog } from "@/lib/posthog-client";

function PostHogPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useLayoutEffect(() => {
    const client = initPostHogClient();
    if (!client) return;
    let url = window.origin + pathname;
    const q = searchParams?.toString();
    if (q) url += `?${q}`;
    client.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentify() {
  const { data: session, status } = useSession();

  useLayoutEffect(() => {
    const client = initPostHogClient();
    if (!client) return;
    if (status === "authenticated" && session?.user?.id) {
      client.identify(session.user.id, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      });
    }
    if (status === "unauthenticated") {
      client.reset();
    }
  }, [session, status]);

  return null;
}

/**
 * Next.js 14 App Router: client provider in root layout (no instrumentation-client.ts).
 * Init runs in useLayoutEffect before child effects so capture() works on first interaction.
 */
export function PostHogAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const token = getPostHogProjectToken();
  const [clientReady, setClientReady] = useState(false);

  useLayoutEffect(() => {
    if (!token) return;
    initPostHogClient();
    setClientReady(true);
  }, [token]);

  if (!token) {
    return <>{children}</>;
  }

  if (!clientReady) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageviews />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PostHogProvider>
  );
}
