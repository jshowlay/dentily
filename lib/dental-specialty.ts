import type { Lead } from "@/lib/types";

export type DentalSpecialty =
  | "general"
  | "orthodontist"
  | "oral_surgeon"
  | "periodontist"
  | "endodontist"
  | "pediatric";

const SPECIALIST_SET = new Set<DentalSpecialty>([
  "orthodontist",
  "oral_surgeon",
  "periodontist",
  "endodontist",
  "pediatric",
]);

export function isDentalSpecialist(specialty: DentalSpecialty): boolean {
  return SPECIALIST_SET.has(specialty);
}

/** Classify listing for peer-group benchmarks (name + Google primary type). */
export function classifyDentalSpecialty(lead: Pick<Lead, "name" | "primaryType">): DentalSpecialty {
  const pt = (lead.primaryType ?? "").toLowerCase();
  const nm = (lead.name ?? "").toLowerCase();

  if (pt.includes("orthodont") || nm.includes("orthodont")) return "orthodontist";
  if (
    pt.includes("oral_surgeon") ||
    pt.includes("maxillofacial") ||
    /\boral\s+(and\s+)?facial\b/.test(nm) ||
    nm.includes("oral surgery") ||
    nm.includes("oms")
  ) {
    return "oral_surgeon";
  }
  if (pt.includes("periodont") || nm.includes("periodont")) return "periodontist";
  if (pt.includes("endodont") || nm.includes("endodont")) return "endodontist";
  if (pt.includes("pediatric") || /\bpediatric\b/.test(nm) || /\bkids?\s+dent/.test(nm)) {
    return "pediatric";
  }
  return "general";
}
