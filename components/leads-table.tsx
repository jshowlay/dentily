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

export function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Niche</TableHead>
          <TableHead>Type</TableHead>
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
          <TableRow key={`${lead.name}-${index}`}>
            <TableCell className="font-medium">{lead.name}</TableCell>
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
              <span className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-900">
                {lead.score ?? "-"}
              </span>
            </TableCell>
            <TableCell className="max-w-[280px]">{lead.reason ?? "-"}</TableCell>
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
