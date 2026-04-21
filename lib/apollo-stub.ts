/**
 * Apollo.io enrichment stub — no network calls. When implemented, return verified
 * decision-maker email + confidence for CSV "Apollo Enrichment" column.
 */
export type ApolloEnrichmentResult = {
  direct_email: string | null;
  decision_maker_name: string | null;
  apollo_confidence: number | null;
};

export function enrichWithApollo(practiceName: string, website: string, city: string): ApolloEnrichmentResult {
  void practiceName;
  void website;
  void city;
  return { direct_email: null, decision_maker_name: null, apollo_confidence: null };
}
