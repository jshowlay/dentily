"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AdminLead = {
  id: number;
  searchId: number;
  niche: string | null;
  name: string;
  primaryType: string | null;
  phone: string | null;
  website: string | null;
  score: number | null;
  createdAt: Date | string;
};

function formatDate(d: Date | string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

export function AdminLeadsTable({ leads }: { leads: AdminLead[] }) {
  const [nicheFilter, setNicheFilter] = useState("all");
  const niches = useMemo(
    () =>
      Array.from(new Set(leads.map((l) => (l.niche ?? "").trim()).filter((v) => v.length > 0))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [leads]
  );
  const visibleLeads = useMemo(
    () => (nicheFilter === "all" ? leads : leads.filter((lead) => (lead.niche ?? "") === nicheFilter)),
    [leads, nicheFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="niche-filter" className="text-sm text-slate-700">
          Filter by niche:
        </label>
        <select
          id="niche-filter"
          value={nicheFilter}
          onChange={(e) => setNicheFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 px-2 text-sm"
        >
          <option value="all">All</option>
          {niches.map((niche) => (
            <option key={niche} value={niche}>
              {niche}
            </option>
          ))}
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Created</TableHead>
            <TableHead>Niche</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Primary Type</TableHead>
            <TableHead>Search ID</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Website</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleLeads.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs text-slate-600">{formatDate(l.createdAt)}</TableCell>
              <TableCell>{l.niche ?? "-"}</TableCell>
              <TableCell className="max-w-[260px]">{l.name}</TableCell>
              <TableCell>{l.primaryType ?? "-"}</TableCell>
              <TableCell className="font-mono text-xs">{l.searchId}</TableCell>
              <TableCell>{l.score ?? "-"}</TableCell>
              <TableCell>{l.phone ?? "-"}</TableCell>
              <TableCell className="max-w-[280px]">
                {l.website ? (
                  <a className="text-blue-600 hover:underline" href={l.website} target="_blank" rel="noreferrer">
                    {l.website}
                  </a>
                ) : (
                  "-"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {visibleLeads.length === 0 ? <p className="text-sm text-slate-600">No leads match this niche.</p> : null}
    </div>
  );
}
