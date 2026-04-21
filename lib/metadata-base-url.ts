/**
 * Safe `metadataBase` for `app/layout.tsx`. Malformed `NEXT_PUBLIC_APP_URL` (e.g. missing protocol)
 * would throw `new URL(...)` and break RSC renders / client navigations.
 */
export function getMetadataBaseUrl(): URL {
  let raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  if (!raw || raw === "undefined" || raw === "null") {
    raw = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  }

  if (raw && !/^https?:\/\//i.test(raw)) {
    raw = `http://${raw}`;
  }

  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}
