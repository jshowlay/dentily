/** Build the buyer-facing CSV export URL (requires session_id and/or token). */
export function buildPackExportHref(
  searchId: number,
  auth: { sessionId?: string | null; token?: string | null }
): string {
  const params = new URLSearchParams();
  const sessionId = auth.sessionId?.trim();
  const token = auth.token?.trim();
  if (sessionId) params.set("session_id", sessionId);
  if (token) params.set("token", token);
  const qs = params.toString();
  return `/api/search/${searchId}/export${qs ? `?${qs}` : ""}`;
}

export function hasPackExportAuthQuery(auth: { sessionId?: string | null; token?: string | null }): boolean {
  return Boolean(auth.sessionId?.trim() || auth.token?.trim());
}
