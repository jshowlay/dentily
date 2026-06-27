import { HashSafeLink } from "@/components/hash-safe-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

type LeadPreview = {
  name: string;
  city: string;
  score: number;
  priority: string;
  opportunityType: string;
  actionTier: string;
  estimatedOpportunity: string;
  why: string[];
  contact: string;
  outreachSnippet: string;
};

const LIVE_SAMPLE_LEADS: LeadPreview[] = [
  {
    name: "Dentists at Midtown",
    city: "Miami, FL",
    score: 76,
    priority: "High",
    opportunityType: "Reputation Gap",
    actionTier: "Tier 1: Ready to Contact",
    estimatedOpportunity: "$3k–$12k/mo",
    why: [
      "4.2-star public rating",
      "469 Google reviews",
      "Rating likely filtering them out of high-intent local searches",
    ],
    contact: "Contact Form",
    outreachSnippet:
      "Hey Dr. Patel — Sarah here, from Growth Dental Co. We help practices climb past the 4.5-star threshold on Google. You're sitting at 4.2 stars with 469 reviews in Miami, which is often the first cut when someone compares practices nearby.",
  },
  {
    name: "Ultra Smile DentaSpa",
    city: "Miami, FL",
    score: 58,
    priority: "High",
    opportunityType: "Established Static",
    actionTier: "Tier 1: Ready to Contact",
    estimatedOpportunity: "$5k–$20k/mo",
    why: [
      "4.8-star rating, 739 reviews",
      "Strong profile but no visible growth motion",
      "Ready for paid acquisition or conversion work",
    ],
    contact: "Email",
    outreachSnippet:
      "Hey Dr. Kim — Marcus here, from Apex Dental Marketing. Strong profile — 4.8 stars and 739 reviews. Most practices at your level are leaving 30–40% of new patients on the table without a paid acquisition channel.",
  },
  {
    name: "My Dentist in Miami",
    city: "Miami, FL",
    score: 64,
    priority: "High",
    opportunityType: "Newer Unknown",
    actionTier: "Tier 1: Ready to Contact",
    estimatedOpportunity: "$3k–$12k/mo",
    why: [
      "4.3-star rating, only 73 reviews",
      "Low review count vs. nearby competitors",
      "Visibility and reputation-building is the immediate unlock",
    ],
    contact: "Email",
    outreachSnippet:
      "Hey Dr. Chen — Jamie here, from Local Practice Growth. Only 73 reviews so far — early-stage practices that move fast on visibility typically double their new patient flow within 90 days.",
  },
];

function clipPitch(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars).trimEnd()}…`;
}

function badgeTone(opportunityType: string): string {
  if (opportunityType === "Reputation Gap") return "bg-emerald-50 text-emerald-800 ring-emerald-600/20";
  if (opportunityType === "Established Static") return "bg-blue-50 text-blue-800 ring-blue-600/20";
  if (opportunityType === "Newer Unknown") return "bg-amber-50 text-amber-800 ring-amber-600/20";
  return "bg-slate-50 text-slate-800 ring-slate-600/20";
}

export function LiveSampleLeads() {
  return (
    <section className="border-b border-slate-200 bg-white py-16 md:py-20">
      <div className="landing-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product Preview</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Real leads from recent searches
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
            These are real dental practices from actual Dentily output — not mockups.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Each row includes a score, a contact path, and an outreach template you customize with your own name and
            pitch.
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
                    <p className="mt-1 text-xs text-slate-500">
                      Priority: {lead.priority} · {lead.actionTier}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Score</p>
                      <p className="text-lg font-bold leading-none text-slate-900">{lead.score}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                        badgeTone(lead.opportunityType)
                      )}
                    >
                      {lead.opportunityType}
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
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {`Est. opportunity: ${lead.estimatedOpportunity}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What to Pitch</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{clipPitch(lead.outreachSnippet, 120)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center">
          <a
            href="/sample/dentily-sample-austin.csv"
            download
            className="text-sm text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
          >
            ↓ Download a real 10-lead sample pack (Austin, TX) — no signup required
          </a>
        </p>

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
              See a Real Lead Pack
            </HashSafeLink>
            <HashSafeLink
              href="/search"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-[48px] border-slate-300 px-8 text-slate-900 hover:bg-slate-100"
              )}
            >
              Preview My Market Free
            </HashSafeLink>
          </div>
        </div>
      </div>
    </section>
  );
}
