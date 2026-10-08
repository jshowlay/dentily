"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Optional second-pass website crawl (non-blocking for the main search request).
 * Refreshes the results page when enrichment finishes so emails/forms can appear.
 */
export function DeferredEnrichment({ searchId }: { searchId: number }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const pageParams = new URLSearchParams(window.location.search);
    const authParams = new URLSearchParams();
    const sessionId = pageParams.get("session_id")?.trim();
    const token = pageParams.get("token")?.trim();
    if (sessionId) authParams.set("session_id", sessionId);
    if (token) authParams.set("token", token);
    const qs = authParams.toString();
    const url = `${window.location.origin}/api/search/${searchId}/enrich${qs ? `?${qs}` : ""}`;
    fetch(url, { method: "POST", credentials: "same-origin" })
      .then((res) => {
        if (res.ok) router.refresh();
      })
      .catch(() => {
        /* non-fatal */
      });
  }, [searchId, router]);

  return null;
}
