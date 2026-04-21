import { HashSafeLink } from "@/components/hash-safe-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

type LeadPreview = {
  name: string;
  city: string;
  score: number;
  badge: string;
  why: string[];
  contact: string;
  pitch: string;
};

const LIVE_SAMPLE_LEADS: LeadPreview[] = [
  {
    name: "Austin Family Dental",
    city: "Austin, TX",
    score: 87,
    badge: "High Opportunity",
    why: [
      "Low Google review count compared to competitors",
      "No visible Google Ads activity",
      "Weak local SEO presence",
    ],
    contact: "Email (high confidence)",
    pitch: "Help increase patient bookings through local SEO and paid ads",
  },
  {
    name: "Bright Smile Dental",
    city: "Round Rock, TX",
    score: 81,
    badge: "Strong Fit",
    why: [
      "Inconsistent online reviews",
      "Limited search visibility for local treatment terms",
      "Website has weak conversion signals",
    ],
    contact: "Contact form (reliable)",
    pitch: "Improve local visibility and turn more website visitors into booked appointments",
  },
  {
    name: "Riverbend Dental Care",
    city: "Cedar Park, TX",
    score: 78,
    badge: "Good Opportunity",
    why: [
      "Competitors appear stronger in local rankings",
      "Low review momentum",
      "No clear paid traffic presence",
    ],
    contact: "Phone or form",
    pitch: "Increase patient demand with stronger local search presence and better follow-up conversion",
  },
];

function badgeTone(label: string): string {
  if (label === "High Opportunity") return "bg-emerald-50 text-emerald-800 ring-emerald-600/20";
  if (label === "Strong Fit") return "bg-blue-50 text-blue-800 ring-blue-600/20";
  return "bg-amber-50 text-amber-800 ring-amber-600/20";
}

export function LiveSampleLeads() {
  return (
    <section className="border-b border-slate-200 bg-white py-16 md:py-20">
      <div className="landing-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product Preview</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Live Sample Leads</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
            See the kind of high-opportunity dental practices Dentily helps you find.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Each lead includes opportunity signals, best contact method, and a relevant pitch angle.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl space-y-5">
          {LIVE_SAMPLE_LEADS.map((lead) => (
            <Card
              key={lead.name}
              className="rounded-2xl border-slate-200 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl text-slate-900">{lead.name}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">{lead.city}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Score</p>
                      <p className="text-lg font-bold leading-none text-slate-900">{lead.score}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                        badgeTone(lead.badge)
                      )}
                    >
                      {lead.badge}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 pt-5 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why This Lead</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {lead.why.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best Contact Method</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{lead.contact}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What to Pitch</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{lead.pitch}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">Sample data shown for demonstration purposes</p>

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center md:p-8">
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Find Better Dental Leads for Outreach</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
            Dentily helps you spot practices with real growth opportunities so you can reach out with a more relevant
            offer.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <HashSafeLink
              href="/search#sample-preview"
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-h-[48px] bg-slate-900 px-8 text-white hover:bg-slate-900/90"
              )}
            >
              View Sample Leads
            </HashSafeLink>
            <HashSafeLink
              href="/search"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-[48px] border-slate-300 px-8 text-slate-900 hover:bg-slate-100"
              )}
            >
              Get My First Leads
            </HashSafeLink>
          </div>
        </div>
      </div>
    </section>
  );
}
