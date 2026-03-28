import OpenAI from "openai";
import { z } from "zod";
import { personalizeDentistOutreachWithSignals } from "@/lib/dentist-outreach";
import {
  classifyOpportunityType,
  classifyPriorityFromScore,
  computeBaseScore,
  type DentistScoringBatchContext,
} from "@/lib/dentist-scoring";
import { Lead, NicheConfig } from "@/lib/types";

const genericAiOutputSchema = z.object({
  score: z.number().int().min(1).max(100),
  reason: z.string().min(1).max(140),
  outreach: z.string().min(1).max(280),
});

const dentistAiOutputSchema = z.object({
  adjustment: z.number(),
  reason: z.string().min(1).max(140),
  outreach: z.string().min(1).max(280),
});

/** Template C — general patient-growth angle (also default when signals thin). */
function dentistFallbackOutreachGeneral(): string {
  return "Hi — I came across your practice and thought there may be room to increase new patient bookings. We help dentists turn their local presence into more appointments — open to a quick idea?";
}

/** Pick A/B/C by signal so fallbacks stay varied and specific. */
function pickDentistFallbackOutreach(lead: Lead): string {
  const r = lead.rating;
  const rc = lead.reviewCount;
  if (r !== null && r !== undefined && r < 4.2) {
    return `Hi — I noticed your practice has a ${r} rating and there may be room to improve how that turns into booked appointments. We help dentists increase new patient flow — open to a quick idea?`;
  }
  if (rc !== null && rc !== undefined && rc > 0) {
    return `Hi — I noticed your practice has around ${rc} reviews. We help dentists turn local visibility into more booked appointments — open to a quick idea?`;
  }
  return dentistFallbackOutreachGeneral();
}

const genericFallback = {
  score: 50,
  reason: "Potential local business lead with possible growth opportunity.",
  outreach:
    "Hi, I came across your business and thought there may be an opportunity to help you generate more local customers.",
};

function clampScore(score: number): number {
  return Math.min(100, Math.max(1, Math.round(score)));
}

/** AI may only nudge the rule-based score by ±8. */
function clampAdjustment(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(8, Math.max(-8, Math.round(n)));
}

function buildGenericPrompt(lead: Lead, nicheConfig: NicheConfig) {
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

function buildDentistStrategistPrompt(lead: Lead, opportunityType: string, baseScore: number) {
  return `You are a sales strategist specializing in helping dental practices attract more patients.

Your job is to analyze this business and generate highly specific, data-aware insights.

Return ONLY valid JSON:

{
  "adjustment": number between -8 and +8,
  "reason": "one specific sentence referencing real data",
  "outreach": "a short personalized outreach message"
}

Rules:
- adjustment must be between -8 and +8 (small tweak to the base score only; do not replace scoring)
- reason must reference actual signals (reviews, rating, website)
- DO NOT use generic phrases like "great opportunity"
- outreach must feel human, not robotic
- outreach must reference patients, bookings, or appointments
- outreach must include a subtle observation from the data
- keep reason under 140 characters
- keep outreach under 280 characters
- JSON only

Business:
Name: ${lead.name}
Type: ${lead.primaryType ?? "N/A"}
Website: ${lead.website ?? "none"}
Rating: ${lead.rating ?? "unknown"}
Review Count: ${lead.reviewCount ?? "unknown"}
Opportunity Type: ${opportunityType}
Base Score: ${baseScore}
`;
}

const GENERIC_REASON_BAN =
  /\b(good lead|great opportunity|potential opportunity|strong opportunity|growth opportunity|solid foundation|measurable opportunity|under-optimized)\b/i;

/** Fallback when AI is missing or too generic — tied to actual signals. */
function dentistFallbackReasonFromSignals(lead: Lead): string {
  if (!lead.website?.trim()) {
    return "No public website — new patients may be choosing easier-to-find practices nearby.";
  }
  const rating = lead.rating;
  const rc = lead.reviewCount;
  if (rating !== null && rating !== undefined && rating < 4.0) {
    return `${rating.toFixed(1)} rating suggests room to improve patient perception.`;
  }
  if (rc !== null && rc !== undefined && rc < 20) {
    return "Low review count suggests untapped visibility potential.";
  }
  if (rc !== null && rc !== undefined && rc < 75) {
    return "Moderate review volume suggests room for stronger local demand.";
  }
  if (
    rating !== null &&
    rating !== undefined &&
    rating >= 4.8 &&
    rc !== null &&
    rc !== undefined &&
    rc >= 250
  ) {
    return "High review volume and strong rating make this a lower-priority target.";
  }
  if (rating !== null && rating !== undefined && rating < 4.2) {
    return `${rating.toFixed(1)} rating suggests room to improve patient perception and bookings.`;
  }
  return "Practice appears established but may still have room to improve patient flow.";
}

function sanitizeDentistReason(lead: Lead, reason: string): string {
  const trimmed = reason.trim().slice(0, 140);
  if (!trimmed || GENERIC_REASON_BAN.test(trimmed)) {
    return dentistFallbackReasonFromSignals(lead);
  }
  return trimmed;
}

const OUTREACH_KEYWORD_RE = /\b(?:patient|patients|booking|bookings|appointment|appointments)\b/i;

function sanitizeDentistOutreach(lead: Lead, outreach: string): string {
  let candidate = (outreach ?? "").trim();
  if (!candidate) {
    candidate = pickDentistFallbackOutreach(lead);
  }
  if (!OUTREACH_KEYWORD_RE.test(candidate)) {
    candidate = pickDentistFallbackOutreach(lead);
  }
  return candidate.length > 280 ? `${candidate.slice(0, 277)}...` : candidate;
}

export type ScoreLeadResult = Pick<Lead, "score" | "reason" | "outreach" | "opportunityType" | "priority"> & {
  usedAiFallback: boolean;
  /** Populated for dentist niche: base rule score and AI delta for logging. */
  dentistScoringMeta?: { baseScore: number; aiAdjustment: number };
};

async function scoreDentistLead(
  lead: Lead,
  batch?: DentistScoringBatchContext
): Promise<ScoreLeadResult> {
  const baseScore = computeBaseScore(lead, batch);
  const opportunityType = classifyOpportunityType(lead);
  const apiKey = process.env.OPENAI_API_KEY;
  const prompt = buildDentistStrategistPrompt(lead, opportunityType, baseScore);

  if (!apiKey) {
    console.warn("[score-lead] Missing OPENAI_API_KEY; dentist fallback (rule-only + templates).");
    const finalScore = clampScore(baseScore);
    return {
      score: finalScore,
      reason: dentistFallbackReasonFromSignals(lead),
      outreach: sanitizeDentistOutreach(
        lead,
        personalizeDentistOutreachWithSignals(lead, pickDentistFallbackOutreach(lead))
      ),
      opportunityType,
      priority: classifyPriorityFromScore(finalScore),
      usedAiFallback: true,
      dentistScoringMeta: { baseScore, aiAdjustment: 0 },
    };
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = dentistAiOutputSchema.parse(JSON.parse(content));
    const adj = clampAdjustment(parsed.adjustment);
    const finalScore = clampScore(baseScore + adj);

    const reason = sanitizeDentistReason(lead, parsed.reason);
    const outreach = sanitizeDentistOutreach(
      lead,
      personalizeDentistOutreachWithSignals(lead, parsed.outreach)
    );

    console.log(
      `[score-lead] dentist place="${lead.name}" base=${baseScore} adj=${adj} final=${finalScore} opp=${opportunityType}`
    );

    return {
      score: finalScore,
      reason,
      outreach,
      opportunityType,
      priority: classifyPriorityFromScore(finalScore),
      usedAiFallback: false,
      dentistScoringMeta: { baseScore, aiAdjustment: adj },
    };
  } catch (err) {
    console.error("[score-lead] Dentist AI scoring failed; using rule score + fallbacks.", err);
    const finalScore = clampScore(baseScore);
    return {
      score: finalScore,
      reason: dentistFallbackReasonFromSignals(lead),
      outreach: sanitizeDentistOutreach(
        lead,
        personalizeDentistOutreachWithSignals(lead, pickDentistFallbackOutreach(lead))
      ),
      opportunityType,
      priority: classifyPriorityFromScore(finalScore),
      usedAiFallback: true,
      dentistScoringMeta: { baseScore, aiAdjustment: 0 },
    };
  }
}

async function scoreGenericLead(lead: Lead, nicheConfig: NicheConfig): Promise<ScoreLeadResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const prompt = buildGenericPrompt(lead, nicheConfig);

  if (!apiKey) {
    console.warn("[score-lead] Missing OPENAI_API_KEY; using generic fallback scoring.");
    return {
      ...genericFallback,
      opportunityType: null,
      priority: classifyPriorityFromScore(genericFallback.score),
      usedAiFallback: true,
    };
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = genericAiOutputSchema.parse(JSON.parse(content));
    const score = clampScore(parsed.score);
    console.log(`[score-lead] generic place="${lead.name}" score=${score}`);

    return {
      score,
      reason: parsed.reason.length > 140 ? `${parsed.reason.slice(0, 137)}...` : parsed.reason,
      outreach: parsed.outreach.length > 280 ? `${parsed.outreach.slice(0, 277)}...` : parsed.outreach,
      opportunityType: null,
      priority: classifyPriorityFromScore(score),
      usedAiFallback: false,
    };
  } catch (err) {
    console.error("[score-lead] Generic AI scoring failed; using fallback.", err);
    return {
      ...genericFallback,
      opportunityType: null,
      priority: classifyPriorityFromScore(genericFallback.score),
      usedAiFallback: true,
    };
  }
}

export async function scoreLead(
  lead: Lead,
  nicheConfig: NicheConfig,
  dentistBatch?: DentistScoringBatchContext
): Promise<ScoreLeadResult> {
  if (nicheConfig.id === "dentists") {
    return scoreDentistLead(lead, dentistBatch);
  }
  return scoreGenericLead(lead, nicheConfig);
}
