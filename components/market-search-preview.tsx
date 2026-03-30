import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Static preview — one row showing the shape of your results, not live data. */
export function MarketSearchPreview() {
  return (
    <Card className="border border-dashed border-slate-300 bg-slate-50/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-800">What you&apos;ll see after you search</CardTitle>
        <p className="text-sm text-slate-600">
          Your run uses live practices for the area you choose. Sample shape below.
        </p>
      </CardHeader>
      <CardContent className="p-0 sm:px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Practice</TableHead>
                <TableHead>Territory</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="min-w-[160px]">Opportunity signal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-slate-800">Riverside Family Dental</TableCell>
                <TableCell className="text-sm">Phoenix, AZ</TableCell>
                <TableCell className="tabular-nums">74</TableCell>
                <TableCell>
                  <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    High
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-600">Reputation gap vs. nearby competitors</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
