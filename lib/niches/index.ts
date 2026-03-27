import { dentistNicheConfig } from "@/lib/niches/dentists";
import { NicheConfig } from "@/lib/types";

const defaultNicheConfig: NicheConfig = {
  id: "generic-local",
  name: "Local Businesses",
  description: "General local business lead generation profile.",
  scoringFactors: [
    "moderate review volume with room to grow",
    "local business with lead generation potential",
    "website and digital presence quality signals",
  ],
  disqualifiers: ["missing all contact info", "clearly irrelevant businesses"],
  outreachStyle: "friendly, concise, value-first, and locally relevant.",
  idealCustomerDescription: "local business that wants more qualified inbound leads",
};

export function getNicheConfig(niche: string): NicheConfig {
  const normalized = niche.trim().toLowerCase();
  if (normalized.includes("dentist") || normalized.includes("dental")) {
    return dentistNicheConfig;
  }
  return defaultNicheConfig;
}
