import Link from "next/link";
import { getRecentLeads, isDatabaseConfigured } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLeadsTable } from "@/components/admin-leads-table";
import { ServerDbError } from "@/components/server-db-error";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <ServerDbError
        title="Database not configured"
        message="DATABASE_URL is missing. Add it to your environment variables so this page can load leads."
      />
    );
  }

  let leads: Awaited<ReturnType<typeof getRecentLeads>>;
  try {
    leads = await getRecentLeads(100);
  } catch (e) {
    console.error("[admin/leads]", e);
    return (
      <ServerDbError
        title="Could not load leads"
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
            <Link href="/admin/searches" className="text-sm underline">
              Searches
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
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminLeadsTable leads={leads} />
            {leads.length === 0 ? <p className="mt-4 text-sm text-slate-600">No leads yet.</p> : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

