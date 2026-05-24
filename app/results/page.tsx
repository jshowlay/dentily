import Link from "next/link";
import { redirect } from "next/navigation";
import { ResultsPageView } from "@/components/results/results-page-view";
import { ServerDbError } from "@/components/server-db-error";
import { sanitizeLeadsForClient } from "@/lib/client-leads";
import { getSearchWithLeads, isDatabaseConfigured } from "@/lib/db";
import { getNicheConfig } from "@/lib/niches";
import { canExportLeadPack } from "@/lib/search-status";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  searchParams,
}: {
  /** Next 15 may pass a Promise; Next 14 passes a plain object — support both. */
  searchParams: Promise<{ searchId?: string }> | { searchId?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const searchIdStr = sp.searchId;
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

    let parsed = null as Awaited<ReturnType<typeof getSearchWithLeads>>;
    let loadError: string | null = null;
    try {
      parsed = await getSearchWithLeads(searchId);
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

    if (!parsed) {
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

    const nicheLabel = getNicheConfig(parsed.niche).name;
    const scoredLeads = parsed.leads.filter((lead) => typeof lead.score === "number");
    const averageScore =
      scoredLeads.length > 0
        ? Math.round(scoredLeads.reduce((sum, lead) => sum + Number(lead.score), 0) / scoredLeads.length)
        : null;
    const canExport = canExportLeadPack(parsed.status, parsed.leads.length);
    const highPriorityCount = parsed.leads.filter((l) => (l.priority ?? "").toLowerCase() === "high").length;

    return (
      <ResultsPageView
        searchId={parsed.id}
        nicheLabel={nicheLabel}
        location={parsed.location}
        status={parsed.status}
        errorMessage={parsed.errorMessage}
        recordCount={parsed.resultCount ?? parsed.leads.length}
        highPriorityCount={highPriorityCount}
        averageScore={averageScore}
        canExport={canExport}
        isPaid={parsed.isPaid}
        leads={sanitizeLeadsForClient(parsed.leads)}
      />
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
