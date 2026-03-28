import { Lead } from "@/lib/types";
import { CopyButton } from "@/components/copy-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function priorityBadge(priority: string | null | undefined) {
  const p = (priority ?? "").toLowerCase();
  if (p === "high") {
    return (
      <span className="rounded-md border-2 border-emerald-600 bg-emerald-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-900 shadow-sm">
        High
      </span>
    );
  }
  if (p === "medium") {
    return (
      <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-800">
        Medium
      </span>
    );
  }
  if (p === "low") {
    return (
      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-normal uppercase text-slate-500">
        Low
      </span>
    );
  }
  return <span className="text-slate-500">—</span>;
}

function opportunityLabel(type: string | null | undefined) {
  if (!type) return "—";
  return (
    <span className="rounded bg-violet-50 px-2 py-0.5 font-mono text-xs text-violet-800">{type.replace(/_/g, " ")}</span>
  );
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Niche</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Opportunity</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Website</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Reviews</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Outreach</TableHead>
          <TableHead>Google Maps</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead, index) => (
          <TableRow
            key={`${lead.placeId ?? lead.name}-${index}`}
            className={
              (lead.priority ?? "").toLowerCase() === "high"
                ? "bg-emerald-50/90 hover:bg-emerald-50"
                : (lead.priority ?? "").toLowerCase() === "low"
                  ? "bg-slate-50/50 text-slate-800"
                  : undefined
            }
          >
            <TableCell
              className={
                (lead.priority ?? "").toLowerCase() === "high"
                  ? "font-bold text-slate-900"
                  : "font-medium"
              }
            >
              {lead.name}
            </TableCell>
            <TableCell>
              {lead.niche ? (
                <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{lead.niche}</span>
              ) : (
                "N/A"
              )}
            </TableCell>
            <TableCell>
              {lead.primaryType ? (
                <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {lead.primaryType}
                </span>
              ) : (
                "N/A"
              )}
            </TableCell>
            <TableCell>{priorityBadge(lead.priority)}</TableCell>
            <TableCell className="max-w-[140px]">{opportunityLabel(lead.opportunityType)}</TableCell>
            <TableCell className="max-w-[220px]">{lead.address ?? "N/A"}</TableCell>
            <TableCell>
              {lead.website ? (
                <a
                  className="text-blue-600 hover:underline"
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  {lead.website}
                </a>
              ) : (
                "N/A"
              )}
            </TableCell>
            <TableCell>{lead.phone ?? "N/A"}</TableCell>
            <TableCell>{lead.rating ?? "N/A"}</TableCell>
            <TableCell>{lead.reviewCount ?? "N/A"}</TableCell>
            <TableCell>
              <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-bold tabular-nums text-slate-900 shadow-sm">
                {lead.score ?? "—"}
              </span>
            </TableCell>
            <TableCell className="max-w-[300px] text-sm leading-snug text-slate-800">{lead.reason ?? "—"}</TableCell>
            <TableCell className="space-y-2">
              <p className="max-w-[320px] truncate text-sm text-slate-700" title={lead.outreach ?? "-"}>
                {lead.outreach ?? "-"}
              </p>
              {lead.outreach ? <CopyButton value={lead.outreach} /> : null}
            </TableCell>
            <TableCell>
              {lead.mapsUrl ? (
                <a
                  className="text-blue-600 hover:underline"
                  href={lead.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              ) : (
                "N/A"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
