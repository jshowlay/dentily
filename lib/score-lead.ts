import OpenAI from "openai";
import { z } from "zod";
import { Lead, NicheConfig } from "@/lib/types";

const aiOutputSchema = z.object({
  score: z.number().int().min(1).max(100),
  reason: z.string().min(1).max(140),
  outreach: z.string().min(1).max(280),
});

const fallback = {
  score: 50,
  reason: "Potential local business lead with possible growth opportunity.",
  outreach:
    "Hi, I came across your business and thought there may be an opportunity to help you generate more local customers.",
};

function buildDentistPrompt(lead: Lead, nicheConfig: NicheConfig) {
  if (nicheConfig.id !== "dentists") {
    return `You are an AI sales analyst for local businesses.
Analyze this business as a potential client for lead generation services.

Return ONLY valid JSON:
{
  "score": integer from 1 to 100,
  "reason": "one concise sentence",
  "outreach": "a short personalized outreach message"
}

Scoring factors: ${nicheConfig.scoringFactors.join("; ")}
Disqualifiers: ${nicheConfig.disqualifiers.join("; ")}
Outreach style: ${nicheConfig.outreachStyle}

Business:
Name: ${lead.name}
Type: ${lead.primaryType ?? "N/A"}
Address: ${lead.address ?? "N/A"}
Website: ${lead.website ?? "N/A"}
Phone: ${lead.phone ?? "N/A"}
Rating: ${lead.rating ?? "N/A"}
Review Count: ${lead.reviewCount ?? "N/A"}

Rules:
- return JSON only
- no markdown
- reason under 140 characters
- outreach under 280 characters
`;
  }

  return `You are an AI sales analyst specializing in local dental practices.

Analyze this business as a potential client for services that help dentists get more patients and increase bookings.

Return ONLY valid JSON:
{
  "score": integer from 1 to 100,
  "reason": "one concise sentence",
  "outreach": "a short personalized outreach message"
}

Scoring guidance:
- prioritize dental practices that could benefit from more patient acquisition
- score higher if:
  - website exists but may not convert well
  - moderate reviews (10-150)
  - rating is good but not dominant
  - likely independent practice
- score lower if:
  - large chain or highly optimized brand
  - extremely strong digital presence
  - missing too much data

Niche profile:
- Ideal customer: ${nicheConfig.idealCustomerDescription}
- Scoring factors: ${nicheConfig.scoringFactors.join("; ")}
- Disqualifiers: ${nicheConfig.disqualifiers.join("; ")}

Business:
Name: ${lead.name}
Type: ${lead.primaryType ?? "N/A"}
Address: ${lead.address ?? "N/A"}
Website: ${lead.website ?? "N/A"}
Phone: ${lead.phone ?? "N/A"}
Rating: ${lead.rating ?? "N/A"}
Review Count: ${lead.reviewCount ?? "N/A"}

Rules:
- return JSON only
- reason must be under 140 characters
- outreach must feel human and specific
- outreach must reference patient growth or bookings
- no markdown
- JSON only
- keep reason under 140 characters
- keep outreach under 280 characters
`;
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(1, Math.round(score)));
}

function applyRuleBasedBoosts(baseScore: number, lead: Lead): number {
  let adjusted = baseScore;
  const reviewCount = lead.reviewCount ?? 0;
  const rating = lead.rating ?? null;

  if (reviewCount < 20) adjusted += 10;
  if (!lead.website) adjusted += 15;
  if (rating !== null && rating >= 3.8 && rating <= 4.5) adjusted += 5;
  if (reviewCount > 300) adjusted -= 10;

  return clampScore(adjusted);
}

function hasStrongBrandingSignals(lead: Lead): boolean {
  const name = (lead.name ?? "").toLowerCase();
  const website = (lead.website ?? "").toLowerCase();
  return (
    name.includes("group") ||
    name.includes("corporate") ||
    name.includes("national") ||
    website.includes("franchise")
  );
}

function improveReason(lead: Lead, reason: string): string {
  const reviewCount = lead.reviewCount ?? null;
  const rating = lead.rating ?? null;
  const isGeneric = /potential local business lead/i.test(reason);
  if (reviewCount !== null && reviewCount < 50) {
    return "Good reviews but limited volume suggests room to grow patient flow.";
  }
  if (rating !== null && rating >= 4 && rating <= 4.7) {
    return "Established practice with moderate reviews and potential for more bookings.";
  }
  if (!lead.website) {
    return "Local dentist with solid reputation but under-optimized online presence.";
  }
  if (isGeneric) {
    return "Local dental practice with room to improve patient flow and online booking conversion.";
  }
  return reason.length > 140 ? `${reason.slice(0, 137)}...` : reason;
}

function improveOutreach(lead: Lead, outreach: string): string {
  const reviewCount = lead.reviewCount ?? null;
  const websitePhrase = lead.website ? "your online presence" : "your website presence";
  let candidate = outreach;
  if (!/patients|appointments|bookings/i.test(candidate)) {
    if (reviewCount !== null && reviewCount > 0) {
      candidate = `Hi, I came across your practice and noticed you have great reviews. We help dentists turn that into more booked appointments and new patients. Open to a quick idea?`;
    } else {
      candidate = `Hi, I came across your practice and think there is an opportunity to drive more new patients through ${websitePhrase} and booked appointments. Open to a quick idea?`;
    }
  }
  return candidate.length > 280 ? `${candidate.slice(0, 277)}...` : candidate;
}

function postProcessDentistScore(lead: Lead, scored: Pick<Lead, "score" | "reason" | "outreach">) {
  const disqualified =
    (!lead.phone && !lead.website) ||
    ((lead.reviewCount ?? 0) > 500 && hasStrongBrandingSignals(lead));
  const boosted = applyRuleBasedBoosts(scored.score ?? fallback.score, lead);
  const adjustedScore = disqualified ? Math.max(1, boosted - 25) : boosted;
  return {
    score: clampScore(adjustedScore),
    reason: improveReason(lead, scored.reason ?? fallback.reason),
    outreach: improveOutreach(lead, scored.outreach ?? fallback.outreach),
  };
}

export async function scoreLead(
  lead: Lead,
  nicheConfig: NicheConfig
): Promise<Pick<Lead, "score" | "reason" | "outreach">> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const prompt = buildDentistPrompt(lead, nicheConfig);
    if (!apiKey) {
      console.warn("[score-lead] Missing OPENAI_API_KEY; using fallback scoring.");
      return nicheConfig.id === "dentists" ? postProcessDentistScore(lead, fallback) : fallback;
    }

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = aiOutputSchema.parse(JSON.parse(content));
    console.log(`[score-lead] scored place="${lead.name}" score=${parsed.score}`);
    return nicheConfig.id === "dentists" ? postProcessDentistScore(lead, parsed) : parsed;
  } catch (err) {
    console.error("[score-lead] AI scoring failed; using fallback.", err);
    return nicheConfig.id === "dentists" ? postProcessDentistScore(lead, fallback) : fallback;
  }
}

