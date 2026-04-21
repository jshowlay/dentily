/**
 * Lightweight contact routing labels for UI and CSV.
 * Kept separate from `lead-pack-export.ts` so client/server boundaries do not pull the full export graph.
 */
export function computeBestContactMethod(input: {
  primary_email: string | null | undefined;
  contact_form_url: string | null | undefined;
  phone: string | null | undefined;
}): string {
  if ((input.primary_email ?? "").trim()) return "Email";
  if ((input.contact_form_url ?? "").trim()) return "Contact Form";
  if ((input.phone ?? "").trim()) return "Phone";
  return "None";
}
