import { NextResponse } from "next/server";
import { unsubscribePreviewCapture } from "@/lib/preview-captures";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function confirmationHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: "DM Sans", system-ui, sans-serif; background: #f7f5f0; color: #1a1a18; margin: 0; padding: 48px 24px; }
    .card { max-width: 420px; margin: 0 auto; background: #fff; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 32px; }
    h1 { font-size: 22px; margin: 0 0 12px; font-weight: 600; }
    p { font-size: 15px; line-height: 1.6; color: #5a5a55; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`;
}

async function handleUnsubscribe(token: string | null): Promise<Response> {
  if (!token?.trim()) {
    return new NextResponse(
      confirmationHtml("Invalid link", "This unsubscribe link is missing or invalid."),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const ok = await unsubscribePreviewCapture(token);
  return new NextResponse(
    confirmationHtml(
      ok ? "You're unsubscribed" : "Already unsubscribed",
      ok
        ? "You won't receive further preview follow-up emails from Dentily for this market."
        : "This address was already unsubscribed or the link has expired."
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  return handleUnsubscribe(token);
}

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token");
  if (!token) {
    try {
      const body = await request.text();
      const params = new URLSearchParams(body);
      token = params.get("token");
    } catch {
      /* ignore */
    }
  }
  return handleUnsubscribe(token);
}
