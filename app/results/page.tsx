import Link from "next/link";
import { redirect } from "next/navigation";
import { DeferredEnrichment } from "@/components/deferred-enrichment";
import { ResultsPageView } from "@/components/results/results-page-view";
import { ServerDbError } from "@/components/server-db-error";
import { getSearchForResultsPage, isDatabaseConfigured } from "@/lib/db";
import { buildLeadsMatchingExportPack } from "@/lib/lead-pack-export";
import { verifyPackAccessForResultsPage } from "@/lib/pack-export-access";
import { buildPackExportHref, hasPackExportAuthQuery } from "@/lib/pack-export-url";
import {
  canViewFullLeadPackOnResults,
  prepareLeadsForResultsClient,
} from "@/lib/results-lead-preview";
import { getNicheConfig } from "@/lib/niches";
import { formatMarketLocationForDisplay } from "@/lib/format-market-location";
import { canExportLeadPack } from "@/lib/search-status";

export const dynamic = "force-dynamic";
/** Colocate with Neon US East when DATABASE_URL is a us-east-1 host (see vercel.json). */
export const preferredRegion = "iad1";

export default async function ResultsPage({
  searchParams,
}: {
  /** Next 15 may pass a Promise; Next 14 passes a plain object — support both. */
  searchParams:
    | Promise<{ searchId?: string; session_id?: string; token?: string }>
    | { searchId?: string; session_id?: string; token?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const searchIdStr = sp.searchId;
  const checkoutSessionId = sp.session_id?.trim() || null;
  const packDownloadToken = sp.token?.trim() || null;
  const rawId = searchIdStr ? Number(searchIdStr) : NaN;
  const searchId = Number.isFinite(rawId) && rawId > 0 ? Math.trunc(rawId) : null;

  if (!searchId) {
    redirect("/");
  }

  try {
    if (!isDatabaseConfigured()) {
      return (
        <ServerDbError
          title="Database not configured"
          message="DATABASE_URL is missing. Add it to your environment variables to load search results."
          backHref="/search"
          backLabel="Back to search"
        />
      );
    }

    const pageT0 = Date.now();
    let loaded: Awaited<ReturnType<typeof getSearchForResultsPage>> = null;
    let loadError: string | null = null;
    try {
      loaded = await getSearchForResultsPage(searchId);
    } catch (e) {
      console.error("[results]", e);
      loadError = e instanceof Error ? e.message : "Could not load this search.";
    }

    if (loadError) {
      return (
        <div className="dentily-results min-h-screen bg-[#F7F5F0] p-8">
          <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-6">
            <p className="font-medium text-red-800">Could not load results</p>
            <p className="mt-2 text-sm text-[#5a5a55]">{loadError}</p>
            <Link href="/search" className="mt-4 inline-block text-sm text-[#2E7D52] underline">
              Back to search
            </Link>
          </div>
        </div>
      );
    }

    if (!loaded) {
      return (
        <div className="dentily-results min-h-screen bg-[#F7F5F0] p-8">
          <div className="mx-auto max-w-lg rounded-lg border border-[rgba(0,0,0,0.1)] bg-white p-6">
            <p className="font-medium text-[#1a1a18]">Search not found</p>
            <p className="mt-2 text-sm text-[#5a5a55]">
              There is no saved search with id <span className="font-mono font-medium">{searchId}</span>.
            </p>
            <Link href="/search" className="mt-4 inline-block text-sm text-[#2E7D52] underline">
              Start a new search
            </Link>
          </div>
        </div>
      );
    }

    const parsed = loaded.search;
    const packT0 = Date.now();
    const displayLeads =
      loaded.exportRows.length > 0 ? buildLeadsMatchingExportPack(loaded.exportRows) : [];
    const packMs = Date.now() - packT0;

    const tAccess0 = Date.now();
    const nicheLabel = getNicheConfig(parsed.niche).name;
    const recordCount = displayLeads.length;
    const scoredLeads = displayLeads.filter((lead) => typeof lead.score === "number");
    const averageScore =
      scoredLeads.length > 0
        ? Math.round(scoredLeads.reduce((sum, lead) => sum + Number(lead.score), 0) / scoredLeads.length)
        : null;
    const canExport = canExportLeadPack(parsed.status, recordCount);
    const packAccess = await verifyPackAccessForResultsPage(parsed.id, {
      sessionId: checkoutSessionId,
      token: packDownloadToken,
    });
    const accessMs = Date.now() - tAccess0;
    const hasBuyerAccess = canViewFullLeadPackOnResults(parsed.isPaid, packAccess);
    const exportCsvHref =
      parsed.isPaid && hasPackExportAuthQuery({ sessionId: checkoutSessionId, token: packDownloadToken })
        ? buildPackExportHref(parsed.id, {
            sessionId: checkoutSessionId,
            token: packDownloadToken,
          })
        : null;
    const { leads: leadsForClient, signalTypeCount } = prepareLeadsForResultsClient(
      displayLeads,
      hasBuyerAccess
    );
    const highPriorityCount = displayLeads.filter((l) => (l.priority ?? "").toLowerCase() === "high").length;

    const pageMs = Date.now() - pageT0;
    console.log("[results/page] timing", {
      searchId,
      vercelRegion: process.env.VERCEL_REGION ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      recordCount,
      exportRowCount: loaded.exportRows.length,
      db: loaded.timings,
      packMs,
      accessMs,
      pageMs,
    });

    return (
      <>
        {loaded.hasPendingEnrichment && (!parsed.isPaid || hasBuyerAccess) ? (
          <DeferredEnrichment searchId={parsed.id} />
        ) : null}
        <ResultsPageView
          searchId={parsed.id}
          nicheLabel={nicheLabel}
          location={
            formatMarketLocationForDisplay(
              parsed.location,
              displayLeads.map((l) => l.address)
            ) || parsed.location
          }
          status={parsed.status}
          errorMessage={parsed.errorMessage}
          recordCount={recordCount}
          highPriorityCount={highPriorityCount}
          averageScore={averageScore}
          canExport={canExport}
          isPaid={parsed.isPaid}
          hasBuyerAccess={hasBuyerAccess}
          exportCsvHref={exportCsvHref}
          signalTypeCount={signalTypeCount}
          leads={leadsForClient}
        />
      </>
    );
  } catch (e) {
    console.error("[results] fatal", e);
    return (
      <ServerDbError
        title="Could not load results"
        message={
          e instanceof Error
            ? e.message
            : "An unexpected error occurred while loading this page. Check the server logs."
        }
        backHref="/search"
        backLabel="Back to search"
      />
    );
  }
}
