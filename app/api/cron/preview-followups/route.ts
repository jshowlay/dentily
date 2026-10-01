import { NextResponse } from "next/server";
import { listPreviewFollowupCandidates, setPreviewEmailSent } from "@/lib/preview-captures";
import { sendPreviewSequenceEmail } from "@/lib/sendPreviewSequenceEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent2: string[] = [];
  const sent3: string[] = [];
  const errors: Array<{ id: string; which: number; message: string }> = [];

  const candidates2 = await listPreviewFollowupCandidates(2, 40);
  for (const row of candidates2) {
    if (!row.previewSnapshot.length) continue;
    try {
      await sendPreviewSequenceEmail(row, 2);
      await setPreviewEmailSent(row.id, 2);
      sent2.push(row.id);
    } catch (err) {
      errors.push({
        id: row.id,
        which: 2,
        message: err instanceof Error ? err.message : String(err),
      });
      console.error("[cron/preview-followups] email 2 failed", row.id, err);
    }
  }

  const candidates3 = await listPreviewFollowupCandidates(3, 40);
  for (const row of candidates3) {
    try {
      await sendPreviewSequenceEmail(row, 3);
      await setPreviewEmailSent(row.id, 3);
      sent3.push(row.id);
    } catch (err) {
      errors.push({
        id: row.id,
        which: 3,
        message: err instanceof Error ? err.message : String(err),
      });
      console.error("[cron/preview-followups] email 3 failed", row.id, err);
    }
  }

  console.log("[cron/preview-followups] complete", {
    email2: sent2.length,
    email3: sent3.length,
    errors: errors.length,
  });

  return NextResponse.json({
    ok: true,
    email2Sent: sent2.length,
    email3Sent: sent3.length,
    errors,
  });
}
