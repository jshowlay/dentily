import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_SAMPLE_COOKIE,
  adminSampleSessionToken,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/admin-sample-auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: { message: "ADMIN_PASSWORD is not configured on the server." } },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body." } }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Password is required." } }, { status: 400 });
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: { message: "Invalid password." } }, { status: 401 });
  }

  const token = adminSampleSessionToken();
  if (!token) {
    return NextResponse.json({ error: { message: "Admin session unavailable." } }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SAMPLE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
