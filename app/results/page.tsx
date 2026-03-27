import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { BuyLeadPackButton } from "@/components/buy-lead-pack-button";
import { LeadsTable } from "@/components/leads-table";
import { ServerDbError } from "@/components/server-db-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeLeadsForClient } from "@/lib/client-leads";
import { getSearchWithLeads, isDatabaseConfigured } from "@/lib/db";
import { canExportLeadPack } from "@/lib/search-status";
import { getNicheConfig } from "@/lib/niches";

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

  /** `/results` alone has nothing to load — send users to the search form. */
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

    const nicheLabel = parsed ? getNicheConfig(parsed.niche).name : null;
    const scoredLeads = parsed?.leads.filter((lead) => typeof lead.score === "number") ?? [];
    const averageScore =
      scoredLeads.length > 0
        ? Math.round(scoredLeads.reduce((sum, lead) => sum + Number(lead.score), 0) / scoredLeads.length)
        : null;
    const canExport = parsed ? canExportLeadPack(parsed.status, parsed.leads.length) : false;

    return (
      <main className="min-h-screen bg-white">
        <header className="w-full bg-black py-4 text-white">
          <div className="container-page flex items-center justify-between">
            <BrandMark />
            <Link
            href="/search"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-slate-100"
          >
            New Search
            </Link>
          </div>
        </header>

        <section className="container-page py-8">
          {loadError ? (
            <Card>
              <CardContent className="pt-6">
                <p className="font-medium text-red-800">Could not load results</p>
                <p className="mt-2 text-sm text-slate-700">{loadError}</p>
                <p className="mt-4 text-sm text-slate-600">
                  Check that <code className="rounded bg-slate-100 px-1">DATABASE_URL</code> is set and the
                  database is reachable, then try again.
                </p>
              </CardContent>
            </Card>
          ) : parsed ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Lead Pack Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                  <p>
                    <span className="font-semibold text-slate-900">Niche:</span> {nicheLabel}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Location:</span> {parsed.location}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Status:</span> {parsed.status}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Total Leads:</span>{" "}
                    {parsed.resultCount ?? parsed.leads.length}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Average Score:</span>{" "}
                    {averageScore ?? "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Created:</span>{" "}
                    {parsed.createdAt ? new Date(parsed.createdAt).toLocaleString() : "-"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm text-slate-700">
                    This pack includes prioritized dental practices, patient-growth context, and ready-to-use outreach
                    messages.
                  </p>
                  {canExport ? (
                    parsed.isPaid ? (
                      <a
                        href={`/api/search/${parsed.id}/export`}
                        download
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/90"
                      >
                        Download CSV
                      </a>
                    ) : (
                      <div className="flex w-full max-w-sm flex-col gap-3 sm:shrink-0">
                        <p className="text-sm font-medium text-slate-900">Unlock your full lead pack</p>
                        <p className="text-sm text-slate-600">
                          Pay once ($49) for instant download — prioritized practices and outreach included.
                        </p>
                        <BuyLeadPackButton searchId={parsed.id} label="Get My Lead Pack" className="w-full sm:w-auto" />
                        <Link
                          href={`/pricing?searchId=${parsed.id}`}
                          className="text-sm text-slate-600 underline underline-offset-4 hover:text-slate-900"
                        >
                          View pricing details
                        </Link>
                      </div>
                    )
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Leads for {parsed.niche} in {parsed.location}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {parsed.status === "failed" ? (
                    <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      This search failed{parsed.errorMessage ? `: ${parsed.errorMessage}` : "."}
                    </p>
                  ) : null}
                  {parsed.leads.length > 0 ? (
                    <LeadsTable leads={sanitizeLeadsForClient(parsed.leads)} />
                  ) : (
                    <p className="text-slate-700">No leads found for this search.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Search not found</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-slate-700">
                  There is no saved search with id <span className="font-mono font-medium">{searchId}</span>. It may
                  have been removed, or <code className="rounded bg-slate-100 px-1 text-sm">DATABASE_URL</code> may
                  point at a different database than the one that created this id.
                </p>
                <Link
                href="/search"
                className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
              >
                Start a new search
                </Link>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
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
