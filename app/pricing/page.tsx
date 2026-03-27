import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuyLeadPackButton } from "@/components/buy-lead-pack-button";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ searchId?: string }> | { searchId?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const searchIdStr = sp.searchId;
  const searchId = searchIdStr ? Number(searchIdStr) : null;
  const validSearchId = searchId && Number.isFinite(searchId) && searchId > 0 ? searchId : null;

  return (
    <main className="min-h-screen bg-white">
      <header className="w-full bg-black py-4 text-white">
        <div className="container-page flex items-center justify-between">
          <BrandMark />
          <div className="flex gap-3">
            <Link href="/" className="text-sm underline">
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="container-page py-10">
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>Dentily Dental Lead Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-4xl font-bold">$49</p>
                <p className="text-sm text-slate-600">One-time payment · USD</p>
              </div>
              <p className="text-sm text-slate-700">
                50 high-opportunity dental practices with prioritized insights and ready-to-use outreach messages.
              </p>
              <ul className="list-inside list-disc space-y-2 text-sm text-slate-700">
                <li>50 qualified dental leads</li>
                <li>Patient-growth insights</li>
                <li>Outreach messages included</li>
                <li>Instant download</li>
              </ul>
              <p className="text-center text-xs text-slate-500">
                Limited to one lead pack per area to avoid overlap.
              </p>

              {validSearchId ? (
                <>
                  <BuyLeadPackButton searchId={validSearchId} label="Get My Lead Pack" className="w-full" />
                  <p className="text-center text-xs text-slate-500">Simple, affordable, and ready to use today.</p>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Run a search first, then return here from your results page, or use the unlock button there.
                  </p>
                  <Link href="/search" className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100">
                    Get My Lead Pack
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
