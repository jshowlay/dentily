import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminResendPackForStripeSession } from "@/lib/admin-resend-pack";
import { readAdminAuthorized, isAdminPasswordConfigured } from "@/lib/admin-sample-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  stripeSessionId: z.string().trim().min(8).max(256),
});

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: { message: "ADMIN_PASSWORD is not configured on the server." } },
      { status: 503 }
    );
  }

  if (!readAdminAuthorized(request, cookies())) {
    return NextResponse.json({ error: { message: "Unauthorized." } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body." } }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "stripeSessionId is required.", details: parsed.error.issues } },
      { status: 400 }
    );
  }

  try {
    const result = await adminResendPackForStripeSession(parsed.data.stripeSessionId);
    if (!result.ok) {
      return NextResponse.json({ error: { message: result.message } }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Resend failed.";
    console.error("[api/admin/resend-pack]", e);
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
