import type { Lead } from "@/lib/types";
import { finalizeMarcusOutreach } from "@/lib/marcus-outreach";

/**
 * Post-process AI or template outreach: strip templated dashes, dedupe sentences, enforce buyer placeholder template.
 */
export function personalizeDentistOutreachWithSignals(lead: Lead, outreach: string): string {
  return finalizeMarcusOutreach(lead, outreach);
}
