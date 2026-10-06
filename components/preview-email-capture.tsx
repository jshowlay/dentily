"use client";

import { FormEvent, useState } from "react";
import { capturePostHogEvent, parseMarketCityState, POSTHOG_EVENTS } from "@/lib/posthog-events";

type Props = {
  searchId: number;
  market: string;
};

export function PreviewEmailCapture({ searchId, market }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const form = e.currentTarget;
    const hp = (form.elements.namedItem("companyWebsite") as HTMLInputElement | null)?.value ?? "";

    try {
      const res = await fetch("/api/preview-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          market,
          searchId,
          companyWebsite: hp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message ? String(data.error.message) : "Could not send preview.");
      }
      const { city, state } = parseMarketCityState(market);
      capturePostHogEvent(POSTHOG_EVENTS.previewEmailSubmitted, {
        city,
        state,
        search_id: searchId,
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="dr-preview-capture is-success" role="status">
        <p className="dr-preview-capture-title">Sent — check your inbox.</p>
        <p className="dr-preview-capture-sub">We emailed your preview and a couple of helpful follow-ups about this market.</p>
      </div>
    );
  }

  return (
    <div className="dr-preview-capture">
      <h2 className="dr-preview-capture-title">Want this preview in your inbox?</h2>
      <p className="dr-preview-capture-sub">
        We&apos;ll email you these results plus a couple of follow-ups about this market. Unsubscribe anytime.
      </p>
      <form className="dr-preview-capture-form" onSubmit={onSubmit}>
        <label className="dr-sr-only" htmlFor="preview-capture-email">
          Email
        </label>
        <input
          id="preview-capture-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@agency.com"
          value={email}
          disabled={status === "loading"}
          onChange={(e) => setEmail(e.target.value)}
          className="dr-preview-capture-input"
        />
        {/* Honeypot — hidden from users */}
        <input
          type="text"
          name="companyWebsite"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="dr-preview-capture-hp"
          defaultValue=""
          onChange={() => {}}
        />
        <button type="submit" className="dr-preview-capture-btn" disabled={status === "loading"}>
          {status === "loading" ? "Sending…" : "Email me this preview"}
        </button>
      </form>
      {status === "error" && errorMessage ? (
        <p className="dr-preview-capture-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
