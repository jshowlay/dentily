import { describeScoreFactors } from "@/lib/lead-score-factors";
import { computeBestContactMethod } from "@/lib/contact-labels";
import {
  isLeadContactable,
  outreachReadinessFromContactSignals,
} from "@/lib/outreach-readiness";
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

function outreachReadinessBadge(lead: Lead) {
  const r = outreachReadinessFromContactSignals(lead);
  if (r === "high") {
    return (
      <span className="rounded-md border border-emerald-500 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900">
        High
      </span>
    );
  }
  if (r === "medium") {
    return (
      <span className="rounded-md border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
        Medium
      </span>
    );
  }
  return (
    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">Low</span>
  );
}

function contactableBadge(lead: Lead) {
  const ok = isLeadContactable(lead);
  return ok ? (
    <span className="rounded-md border border-emerald-200 bg-emerald-50/80 px-2 py-0.5 text-xs font-medium text-emerald-900">
      Yes
    </span>
  ) : (
    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">No</span>
  );
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Practice</TableHead>
          <TableHead>Niche</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Opportunity</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Website</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Outreach ready</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Contact form</TableHead>
          <TableHead>Email status</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Reviews</TableHead>
          <TableHead>Score</TableHead>
          <TableHead className="min-w-[140px]">Why this score?</TableHead>
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
            <TableCell>{contactableBadge(lead)}</TableCell>
            <TableCell className="whitespace-nowrap text-xs text-slate-700">
              {computeBestContactMethod({
                primary_email: lead.primaryEmail,
                contact_form_url: lead.contactFormUrl,
                phone: lead.phone,
              })}
            </TableCell>
            <TableCell>{outreachReadinessBadge(lead)}</TableCell>
            <TableCell className="max-w-[200px] text-xs">
              {lead.primaryEmail ? (
                <a className="text-blue-600 hover:underline" href={`mailto:${lead.primaryEmail}`}>
                  {lead.primaryEmail}
                </a>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="max-w-[180px] text-xs">
              {lead.contactFormUrl ? (
                <a
                  className="break-all text-blue-600 hover:underline"
                  href={lead.contactFormUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Link
                </a>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-slate-600">
              {lead.emailStatus?.replace(/_/g, " ") ?? "—"}
            </TableCell>
            <TableCell>{lead.rating ?? "N/A"}</TableCell>
            <TableCell>{lead.reviewCount ?? "N/A"}</TableCell>
            <TableCell>
              <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-bold tabular-nums text-slate-900 shadow-sm">
                {lead.score ?? "—"}
              </span>
            </TableCell>
            <TableCell className="align-top text-xs text-slate-600">
              <details className="group">
                <summary className="cursor-pointer list-none font-medium text-blue-700 underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
                  View factors
                </summary>
                <ul className="mt-2 max-w-[260px] space-y-1.5 border-l-2 border-slate-200 pl-2.5 text-left leading-snug text-slate-600">
                  {describeScoreFactors(lead).map((line, i) => (
                    <li key={`${lead.placeId}-${i}`}>{line}</li>
                  ))}
                </ul>
              </details>
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
