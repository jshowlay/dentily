import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { buildScoredLeads } from "@/lib/build-scored-leads";
import { createSearch, getSearchWithLeads, insertLeads, setSearchStatus } from "@/lib/db";
import { getNicheConfig } from "@/lib/niches";
import {
  createSearchForUser,
  decrementSearchCredit,
  getSubscriptionByUserId,
  markSearchPaidForUser,
} from "@/lib/subscription-db";
import { PUBLIC_SEARCH_MAX_DURATION_SEC } from "@/lib/public-search-runtime-config";
import { redactLeadsForPublicPreview } from "@/lib/results-lead-preview";
import { PENDING_ENRICHMENT } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = PUBLIC_SEARCH_MAX_DURATION_SEC;

const searchSchema = z.object({
  niche: z.string().trim().min(2),
  location: z.string().trim().min(2),
  useCredits: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: { message: "Missing DATABASE_URL in environment variables." } },
        { status: 500 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { message: "Request body must be valid JSON." } },
        { status: 400 }
      );
    }

    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Invalid request payload.", details: parsed.error.issues } },
        { status: 400 }
      );
    }
    const { niche, location, useCredits } = parsed.data;
    const nicheConfig = getNicheConfig(niche);

    let subscriptionUserId: number | null = null;
    if (useCredits) {
      const userId = await requireUserId();
      if (!userId) {
        return NextResponse.json(
          { error: { message: "Sign in to run a subscription search." } },
          { status: 401 }
        );
      }
      const sub = await getSubscriptionByUserId(userId);
      const isActive = sub?.status === "active" || sub?.status === "trialing";
      const hasCredits = (sub?.creditsRemaining ?? 0) > 0;
      if (!isActive || !hasCredits) {
        return NextResponse.json(
          {
            error: {
              message: "No search credits remaining.",
              upgradeUrl: "/pricing",
            },
          },
          { status: 402 }
        );
      }
      subscriptionUserId = userId;
    }

    let searchId: number;
    try {
      searchId = subscriptionUserId
        ? await createSearchForUser(subscriptionUserId, niche, location)
        : await createSearch(niche, location);
    } catch (dbError) {
      console.error("[api/search] createSearch failed:", dbError);
      const hint = dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json(
        {
          error: {
            message:
              process.env.NODE_ENV === "development"
                ? `Database error (create search): ${hint}`
                : "Could not save your search. Check DATABASE_URL and that the database is running and reachable.",
          },
        },
        { status: 500 }
      );
    }

    console.log(
      `[api/search] niche="${niche}" nicheId=${nicheConfig.id} location="${location}" searchId=${searchId}`
    );

    try {
      const tRequest = Date.now();
      const scoredLeads = await buildScoredLeads({
        searchId,
        niche,
        location,
        nicheConfig,
        subscriptionUserId,
      });
      console.log(
        `[api/search] searchId=${searchId} buildScoredLeads ms=${Date.now() - tRequest} count=${scoredLeads.length}`
      );

      if (scoredLeads.length === 0) {
        await setSearchStatus(searchId, "completed", { resultCount: 0 });
        return NextResponse.json({
          searchId,
          niche,
          location,
          status: "completed",
          resultCount: 0,
          leads: [],
        });
      }

      const leadsForInsert = scoredLeads.map((l) => ({
        ...l,
        ...PENDING_ENRICHMENT,
      }));

      console.log(`[api/search] insert count=${leadsForInsert.length}`);

      const tPersist = Date.now();
      const inserted = await insertLeads(searchId, leadsForInsert);
      await setSearchStatus(searchId, "completed", { resultCount: inserted });
      console.log(`[api/search] searchId=${searchId} persist ms=${Date.now() - tPersist}`);

      if (subscriptionUserId) {
        await markSearchPaidForUser(searchId, subscriptionUserId);
        await decrementSearchCredit(subscriptionUserId);
      }

      const savedSearch = await getSearchWithLeads(searchId);
      const totalMs = Date.now() - tRequest;
      console.log(
        `[api/search] searchId=${searchId} total ms=${totalMs} limitSec=${PUBLIC_SEARCH_MAX_DURATION_SEC} headroomMs=${PUBLIC_SEARCH_MAX_DURATION_SEC * 1000 - totalMs}`
      );

      const isPaidOut = Boolean(subscriptionUserId) || Boolean(savedSearch?.isPaid);
      const rawLeads = savedSearch?.leads ?? [];
      return NextResponse.json({
        searchId,
        niche,
        location,
        status: "completed",
        resultCount: inserted,
        leads: isPaidOut && subscriptionUserId ? rawLeads : redactLeadsForPublicPreview(rawLeads),
        isPaid: isPaidOut,
      });
    } catch (innerError) {
      console.error("[api/search] processing failed:", innerError);
      await setSearchStatus(
        searchId,
        "failed",
        {
          errorMessage:
            innerError instanceof Error ? innerError.message : "Unknown processing error",
        }
      );
      return NextResponse.json(
        {
          error: {
            message:
              innerError instanceof Error
                ? innerError.message
                : "Processing error while generating leads",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[api/search] unexpected error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: "Invalid request payload.", details: error.issues } },
        { status: 400 }
      );
    }

    const hint = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: {
          message:
            process.env.NODE_ENV === "development"
              ? `Server error: ${hint}`
              : "Server error while processing request.",
        },
      },
      { status: 500 }
    );
  }
}
