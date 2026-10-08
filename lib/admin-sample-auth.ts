import { createHmac, timingSafeEqual } from "node:crypto";

export type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export const ADMIN_SAMPLE_COOKIE = "dentily_admin_sample";

function adminTokenSecret(): string | null {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  return pw && pw.length > 0 ? pw : null;
}

/** Cookie value stored after successful password login. */
export function adminSampleSessionToken(): string | null {
  const secret = adminTokenSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update("dentily-admin-sample-v1").digest("hex");
}

export function isAdminPasswordConfigured(): boolean {
  return Boolean(adminTokenSecret());
}

export function verifyAdminPassword(password: string): boolean {
  const expected = adminTokenSecret();
  if (!expected) return false;
  const a = createHmac("sha256", "dentily-admin-pw-check").update(password).digest();
  const b = createHmac("sha256", "dentily-admin-pw-check").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function isAdminSampleSessionValid(cookieValue: string | null | undefined): boolean {
  const token = adminSampleSessionToken();
  if (!token || !cookieValue) return false;
  if (cookieValue.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(token));
}

export function readAdminAuthorized(request: Request, cookies?: CookieReader): boolean {
  const fromCookie = cookies?.get(ADMIN_SAMPLE_COOKIE)?.value;
  if (isAdminSampleSessionValid(fromCookie)) return true;
  const header = request.headers.get("x-admin-password")?.trim();
  if (header && verifyAdminPassword(header)) return true;
  return false;
}
