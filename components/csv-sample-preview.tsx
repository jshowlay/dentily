import { SITE } from "@/lib/site-config";

const SAMPLE_ROW: { column: string; value: string }[] = [
  { column: "Practice Name", value: "Riverbend Dental Care" },
  { column: "City", value: "Cedar Park, TX" },
  { column: "Google Maps Link", value: "maps.google.com/..." },
  { column: "Star Rating", value: "3.9" },
  { column: "Review Count", value: "41" },
  { column: "Priority", value: "High" },
  { column: "Score", value: "78" },
  {
    column: "Why This Lead",
    value: "Competitors rank stronger locally; low review momentum; no visible paid traffic",
  },
  { column: "Estimated Opportunity", value: "$1,500–$4,000/mo engagement" },
  { column: "Best Contact Path", value: "Phone or contact form" },
  {
    column: "Outreach Draft",
    value:
      '"Hi — I noticed Riverbend Dental is getting outranked by a few nearby practices on Google. We help dental offices fix that pretty quickly. Worth a 10-minute chat?"',
  },
];

export function CsvSamplePreview() {
  return (
    <section
      className="mt-10 rounded-xl border border-slate-200 bg-slate-50/90 p-5 shadow-sm ring-1 ring-slate-100 md:p-6"
      aria-labelledby="csv-sample-heading"
    >
      <h2 id="csv-sample-heading" className="text-lg font-semibold text-slate-900">
        What&apos;s inside your CSV download
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        One sample row — your export includes up to {SITE.leadPackCount} practices with the same style of fields.
      </p>
      <div className="mt-4 -mx-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-1 pb-1 pt-0 shadow-inner">
        <table className="min-w-[720px] w-full border-collapse text-left text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {SAMPLE_ROW.map(({ column }) => (
                <th
                  key={column}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-800 md:px-4 md:py-3"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {SAMPLE_ROW.map(({ column, value }) => (
                <td key={column} className="max-w-[220px] px-3 py-2.5 align-top text-slate-700 md:px-4 md:py-3">
                  <span className="block leading-relaxed">{value}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500 md:text-sm">
        Actual columns may vary slightly by market. Email fields included where publicly available.
      </p>
    </section>
  );
}
