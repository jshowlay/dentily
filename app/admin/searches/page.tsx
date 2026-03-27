import Link from "next/link";
import { getRecentSearches, isDatabaseConfigured } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canExportLeadPack } from "@/lib/search-status";
import { ServerDbError } from "@/components/server-db-error";

export const dynamic = "force-dynamic";

export default async function AdminSearchesPage() {
  if (!isDatabaseConfigured()) {
    return (
      <ServerDbError
        title="Database not configured"
        message="DATABASE_URL is missing. Add it to your environment variables so this page can load searches."
      />
    );
  }

  let searches: Awaited<ReturnType<typeof getRecentSearches>>;
  try {
    searches = await getRecentSearches(50);
  } catch (e) {
    console.error("[admin/searches]", e);
    return (
      <ServerDbError
        title="Could not load searches"
        message={e instanceof Error ? e.message : "Unknown database error."}
      />
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="w-full bg-black py-4 text-white">
        <div className="container-page flex items-center justify-between">
          <p className="text-lg font-semibold">Leadly Admin</p>
          <div className="flex items-center gap-3">
            <Link href="/admin/leads" className="text-sm underline">
              Leads
            </Link>
            <Link href="/" className="text-sm underline">
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="container-page py-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Niche</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result Count</TableHead>
                  <TableHead>Export</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searches.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id}</TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {new Date(s.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[240px]">{s.niche}</TableCell>
                    <TableCell className="max-w-[240px]">{s.location}</TableCell>
                    <TableCell>
                      <span
                        className={
                          s.status === "failed"
                            ? "rounded bg-red-50 px-2 py-1 text-xs text-red-700"
                            : "rounded bg-slate-50 px-2 py-1 text-xs text-slate-700"
                        }
                      >
                        {s.status}
                      </span>
                    </TableCell>
                    <TableCell>{s.resultCount}</TableCell>
                    <TableCell>
                      {canExportLeadPack(s.status, s.leadsCount) ? (
                        <a
                          className="text-sm text-blue-600 hover:underline"
                          href={`/api/search/${s.id}/export`}
                          download
                        >
                          Download CSV
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="max-w-[320px] text-xs text-slate-600">
                      {s.status === "failed" ? s.errorMessage ?? "-" : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {searches.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No searches yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

