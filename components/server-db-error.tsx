import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ServerDbError({
  title,
  message,
  backHref = "/",
  backLabel = "Back to home",
}: {
  title: string;
  message: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-white">
      <header className="w-full bg-black py-4 text-white">
        <div className="container-page flex items-center justify-between">
          <p className="text-lg font-semibold">Leadly</p>
        </div>
      </header>
      <section className="container-page py-10">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700">{message}</p>
            <p className="text-sm text-slate-600">
              In production, confirm <code className="rounded bg-slate-100 px-1">DATABASE_URL</code> is set in
              your host (e.g. Vercel → Settings → Environment Variables) and redeploy.
            </p>
            <Link href={backHref} className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100">
              {backLabel}
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
