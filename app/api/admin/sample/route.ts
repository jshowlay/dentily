import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readAdminAuthorized, isAdminPasswordConfigured } from "@/lib/admin-sample-auth";
import {
  ADMIN_SAMPLE_EMAIL_BULLET_COUNT,
  ADMIN_SAMPLE_RESULT_LIMIT,
} from "@/lib/admin-sample-config";
import { formatAdminSampleEmailBullets, runAdminSampleMarket } from "@/lib/admin-sample-run";

export const runtime = "nodejs";
/** Match long-running enrich/search routes (Vercel Pro ceiling). */
export const maxDuration = 300;

const bodySchema = z.object({
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(40),
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
      { error: { message: "City and state are required.", details: parsed.error.issues } },
      { status: 400 }
    );
  }

  try {
    const leads = await runAdminSampleMarket(
      parsed.data.city,
      parsed.data.state,
      ADMIN_SAMPLE_RESULT_LIMIT
    );
    return NextResponse.json({
      market: `${parsed.data.city}, ${parsed.data.state.toUpperCase()}`,
      leads,
      emailCopy: formatAdminSampleEmailBullets(leads, ADMIN_SAMPLE_EMAIL_BULLET_COUNT),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sample generation failed.";
    console.error("[api/admin/sample]", e);
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
