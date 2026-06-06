import { NextRequest, NextResponse } from "next/server";
import { enrichEmail } from "@/lib/enrichEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { domain, practice_name, city, state } = body as {
    domain?: string;
    practice_name?: string;
    city?: string;
    state?: string;
  };
  if (!domain) return NextResponse.json({ email: null }, { status: 400 });

  const result = await enrichEmail({
    domain,
    practice_name: practice_name ?? "",
    city: city ?? "",
    state: state ?? "",
  });
  return NextResponse.json(result);
}
