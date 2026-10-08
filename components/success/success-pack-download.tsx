"use client";

import { useEffect, useState } from "react";
import { buildPackExportHref } from "@/lib/pack-export-url";

type Props = {
  searchId: number;
  sessionId?: string | null;
  packDownloadToken?: string | null;
};

export function SuccessPackDownload({ searchId, sessionId, packDownloadToken }: Props) {
  const exportHref = buildPackExportHref(searchId, { sessionId, token: packDownloadToken });
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (sessionId?.trim()) params.set("session_id", sessionId.trim());
    if (packDownloadToken?.trim()) params.set("token", packDownloadToken.trim());
    const qs = params.toString();

    async function poll() {
      try {
        const res = await fetch(`/api/search/${searchId}/pack-ready${qs ? `?${qs}` : ""}`, {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { ready?: boolean };
        if (cancelled) return;
        if (data.ready) {
          setReady(true);
          setChecking(false);
          return;
        }
      } catch {
        /* retry */
      }
      if (!cancelled) {
        window.setTimeout(poll, 3000);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [searchId, sessionId, packDownloadToken]);

  if (ready) {
    return (
      <a href={exportHref} download className="dsu-btn dsu-btn-ghost">
        ⬇ Download CSV
      </a>
    );
  }

  return (
    <div className="dsu-pack-preparing">
      <button type="button" className="dsu-btn dsu-btn-ghost" disabled aria-busy={checking}>
        Preparing CSV…
      </button>
      <p className="dsu-pack-preparing-copy">
        Preparing your pack — this usually takes about 2–3 minutes, and we&apos;ll also email it to you.
      </p>
    </div>
  );
}
