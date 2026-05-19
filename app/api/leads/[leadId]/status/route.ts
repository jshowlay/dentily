import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { LEAD_CRM_STATUSES } from "@/lib/subscription-types";
import { upsertLeadStatus } from "@/lib/subscription-db";

const bodySchema = z.object({
  status: z.enum(["new", "contacted", "replied", "booked", "won", "not_a_fit"]),
  note: z.string().max(2000).optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { leadId: string } }
) {
  try {
    const userId = await requireUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leadId = Number(params.leadId);
    if (!Number.isFinite(leadId) || leadId <= 0) {
      return NextResponse.json({ error: "Invalid lead id." }, { status: 400 });
    }

    const json = await request.json();
    const { status, note } = bodySchema.parse(json);

    if (!LEAD_CRM_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const entry = await upsertLeadStatus({ userId, leadId, status, note });
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof Error && error.message === "Lead not found") {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    console.error("[api/leads/status]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
