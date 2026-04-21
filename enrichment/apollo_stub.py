# APOLLO INTEGRATION STUB — implement when Apollo API key is available.
# See https://apolloio.github.io/apollo-api-docs/ for enrichment endpoint.
# Expected cost: ~$0.05-0.10 per record at standard tier.
# Wire this into the enrichment stage in pipeline.py after the email validator step.


def enrich_with_apollo(practice_name: str, website: str, city: str) -> dict:
    """
    When implemented, returns e.g.:
    {"direct_email": str | None, "decision_maker_name": str | None, "apollo_confidence": float | None}
    """
    return {"direct_email": None, "decision_maker_name": None, "apollo_confidence": None}
