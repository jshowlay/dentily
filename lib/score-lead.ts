import OpenAI from "openai";
import { z } from "zod";
import { personalizeDentistOutreachWithSignals } from "@/lib/dentist-outreach";
import {
  classifyOpportunityType,
  classifyPriorityFromScore,
  computeBaseScore,
  computeExportReasonLine,
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

const dentistBatchItemsSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int().min(0),
      adjustment: z.number(),
      reason: z.string(),
      outreach: z.string(),
    })
  ),
});

/** ~16 leads per request balances latency, token limits, and JSON reliability. */
const DENTIST_SCORE_BATCH_SIZE = 16;

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
  return `You are drafting B2B outreach for a buyer who sells marketing services to dental practices. The buyer will replace placeholders before sending.

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
- outreach must sound like a careful human, not a template
- outreach must mention new patients, bookings, or scheduling context at least once
- outreach must include a subtle observation from the data
- NEVER use the words: leverage, solutions, partner (or partnering)
- NEVER use long dashes or em dashes. Use periods and short sentences.
- outreach must start with: {{your_name}} here, from {{your_company}}. {{your_credibility_line}}
- Do not invent a real person's name or company. Use those placeholders exactly.
- End with a concrete CTA that names what you will send, how long it takes to consume, and the exact reply token (example: reply LOOM for a 2-minute Loom)
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

function sanitizeDentistReason(lead: Lead, reason: string): string {
  const trimmed = reason.trim().slice(0, 140);
  if (!trimmed || GENERIC_REASON_BAN.test(trimmed)) {
    return computeExportReasonLine(lead).slice(0, 140);
  }
  return trimmed;
}

const OUTREACH_KEYWORD_RE =
  /\b(?:patient|patients|booking|booked|bookings|appointment|appointments|referrals?|hiring|loom|clip|audit|walkthrough|visibility|maps)\b/i;

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
      reason: computeExportReasonLine(lead).slice(0, 140),
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
      reason: computeExportReasonLine(lead).slice(0, 140),
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

function buildDentistBatchPrompt(
  chunk: Array<{ lead: Lead; baseScore: number; opportunityType: string }>
): string {
  const lines = chunk.map(
    ({ lead, baseScore, opportunityType }, i) =>
      `${i}. Name: ${lead.name}
   Type: ${lead.primaryType ?? "N/A"}
   Website: ${lead.website ?? "none"}
   Rating: ${lead.rating ?? "unknown"}
   Review count: ${lead.reviewCount ?? "unknown"}
   Opportunity type: ${opportunityType}
   Base score: ${baseScore}`
  );
  const n = chunk.length;
  return `You are drafting B2B outreach for buyers who sell marketing services to dental practices. They will replace placeholders before sending.

For EACH of the ${n} businesses below, produce:
- adjustment: integer from -8 to +8 (small tweak to base score only; do not replace scoring)
- reason: one specific sentence referencing real data, under 140 characters, no generic phrases like "great opportunity"
- outreach: under 280 characters; human tone; mention new patients or bookings once; include a subtle observation from the data; start with exactly: {{your_name}} here, from {{your_company}}. {{your_credibility_line}}
- NEVER use: leverage, solutions, partner. NEVER use em dashes. Use a concrete CTA with reply token and time box (e.g. 2-minute Loom).

Return ONLY valid JSON in this exact shape:
{"items":[{"index":0,"adjustment":0,"reason":"...","outreach":"..."},...]}

Rules:
- items must have exactly ${n} entries
- each index must be 0 through ${n - 1} exactly once
- JSON only, no markdown

Businesses:

${lines.join("\n\n")}`;
}

async function scoreDentistChunkWithAi(
  chunk: Array<{ lead: Lead; baseScore: number; opportunityType: string }>,
  dentistBatch?: DentistScoringBatchContext
): Promise<ScoreLeadResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Promise.all(chunk.map(({ lead }) => scoreDentistLead(lead, dentistBatch)));
  }

  const prompt = buildDentistBatchPrompt(chunk);

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = dentistBatchItemsSchema.parse(JSON.parse(content));
    const indices = parsed.items.map((it) => it.index);
    const unique = new Set(indices);
    if (unique.size !== chunk.length || parsed.items.length !== chunk.length) {
      throw new Error(`batch index set mismatch: want ${chunk.length} unique, got ${unique.size}`);
    }
    const maxIdx = Math.max(...indices);
    const minIdx = Math.min(...indices);
    if (minIdx !== 0 || maxIdx !== chunk.length - 1) {
      throw new Error(`batch index range invalid: min=${minIdx} max=${maxIdx} n=${chunk.length}`);
    }

    const byIndex = new Map(parsed.items.map((it) => [it.index, it]));
    const out: ScoreLeadResult[] = [];

    for (let i = 0; i < chunk.length; i++) {
      const row = chunk[i]!;
      const item = byIndex.get(i);
      if (!item) throw new Error(`missing batch index ${i}`);

      const adj = clampAdjustment(item.adjustment);
      const finalScore = clampScore(row.baseScore + adj);
      const reason = sanitizeDentistReason(row.lead, item.reason);
      const outreach = sanitizeDentistOutreach(
        row.lead,
        personalizeDentistOutreachWithSignals(row.lead, item.outreach)
      );

      console.log(
        `[score-lead] dentist batch place="${row.lead.name}" base=${row.baseScore} adj=${adj} final=${finalScore} opp=${row.opportunityType}`
      );

      out.push({
        score: finalScore,
        reason,
        outreach,
        opportunityType: row.opportunityType,
        priority: classifyPriorityFromScore(finalScore),
        usedAiFallback: false,
        dentistScoringMeta: { baseScore: row.baseScore, aiAdjustment: adj },
      });
    }

    return out;
  } catch (err) {
    console.error("[score-lead] Dentist batch chunk failed; falling back to per-lead for chunk.", err);
    return Promise.all(chunk.map(({ lead }) => scoreDentistLead(lead, dentistBatch)));
  }
}

/**
 * Scores dentist leads with far fewer OpenAI round trips than per-lead calls (better latency + fewer rate-limit issues).
 */
export async function scoreDentistLeadsBatched(
  leads: Lead[],
  dentistBatch?: DentistScoringBatchContext
): Promise<ScoreLeadResult[]> {
  if (leads.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Promise.all(leads.map((l) => scoreDentistLead(l, dentistBatch)));
  }

  const rows = leads.map((lead) => ({
    lead,
    baseScore: computeBaseScore(lead, dentistBatch),
    opportunityType: classifyOpportunityType(lead),
  }));

  const chunks: typeof rows[] = [];
  for (let i = 0; i < rows.length; i += DENTIST_SCORE_BATCH_SIZE) {
    chunks.push(rows.slice(i, i + DENTIST_SCORE_BATCH_SIZE));
  }

  const chunkResults = await Promise.all(
    chunks.map((chunk) => scoreDentistChunkWithAi(chunk, dentistBatch))
  );
  return chunkResults.flat();
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
