/** Double-curly placeholders buyers replace before sending (CSV outreach drafts). */
export const OUTREACH_PLACEHOLDER_TAGS = [
  "{{your_name}}",
  "{{your_company}}",
  "{{your_credibility_line}}",
] as const;

export function computePlaceholdersRemaining(outreachDraft: string): string {
  return OUTREACH_PLACEHOLDER_TAGS.filter((t) => outreachDraft.includes(t)).join(", ");
}
