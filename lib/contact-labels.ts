/**
 * Lightweight contact routing labels for UI and CSV.
 * Kept separate from `lead-pack-export.ts` so client/server boundaries do not pull the full export graph.
 */
export function computeBestContactMethod(input: {
  primary_email?: string | null | undefined;
  primaryEmail?: string | null | undefined;
  contact_form_url?: string | null | undefined;
  contactFormUrl?: string | null | undefined;
  phone?: string | null | undefined;
}): string {
  const email = (input.primary_email ?? input.primaryEmail ?? "").trim();
  const form = (input.contact_form_url ?? input.contactFormUrl ?? "").trim();
  const phone = (input.phone ?? "").trim();
  if (email) return "Email";
  if (form) return "Contact Form";
  if (phone) return "Phone";
  return "None";
}

export type ResultsContactDisplay =
  | { kind: "locked" }
  | { kind: "empty" }
  | { kind: "method"; label: string };

/** Results table: locked packs never show "None" when contacts are hidden. */
export function resolveResultsContactDisplay(
  input: Parameters<typeof computeBestContactMethod>[0],
  opts: { contactsLocked: boolean }
): ResultsContactDisplay {
  if (opts.contactsLocked) return { kind: "locked" };
  const label = computeBestContactMethod(input);
  if (label === "None") return { kind: "empty" };
  return { kind: "method", label };
}
