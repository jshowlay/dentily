/**
 * One-off: website discovery + enrichment for Dentist in Austin (Google bad domain).
 *
 *   npx tsx --env-file=.env.local scripts/test-website-discovery-dentist-austin.ts
 */
import { loadEmailEnrichmentConfig } from "@/lib/email-enrichment-config";
import { enrichLeadWebsite } from "@/lib/email-enrichment";
import {
  discoverCorrectedPracticeWebsite,
  parseAddressStreetSignals,
} from "@/lib/website-discovery";
import { hunterCandidateDomainsForPractice } from "@/lib/enrichment/hunter-discover";

const LEAD = {
  placeId: "test-dentist-in-austin",
  name: "Dentist in Austin",
  website: "http://dentistinaustin.health/",
  address: "2110 W Slaughter Ln Ste 190, Austin, TX 78748, USA",
  phone: "(209) 315-7212",
};

async function main(): Promise<void> {
  const config = loadEmailEnrichmentConfig();

  const fetchHtml = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": config.userAgent,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const html = await res.text();
      return { html, finalUrl: res.url || url };
    } catch {
      clearTimeout(timer);
      return null;
    }
  };

  console.log("=== Address signals ===");
  console.log(parseAddressStreetSignals(LEAD.address));

  console.log("\n=== Hunter domain candidates ===");
  const candidates = await hunterCandidateDomainsForPractice(LEAD.name, "Austin", "TX");
  console.log(candidates);

  console.log("\n=== Website discovery (validated) ===");
  const corrected = await discoverCorrectedPracticeWebsite({
    practiceName: LEAD.name,
    address: LEAD.address,
    phone: LEAD.phone,
    googleWebsite: LEAD.website,
    fetchHtml,
    city: "Austin",
    state: "TX",
  });
  console.log(corrected);

  console.log("\n=== Full enrichLeadWebsite pass ===");
  const patch = await enrichLeadWebsite(
    {
      placeId: LEAD.placeId,
      name: LEAD.name,
      website: LEAD.website,
      address: LEAD.address,
      phone: LEAD.phone,
    },
    config
  );
  console.log(JSON.stringify(patch, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
