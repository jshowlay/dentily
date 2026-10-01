import { randomBytes } from "crypto";
import type { Lead } from "@/lib/types";
import { ensureSchema, getPool } from "@/lib/db";
import type { PreviewCaptureRow, PreviewLeadSnapshot } from "@/lib/preview-capture-types";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeMarket(market: string): string {
  return market.trim();
}

function mapRow(row: Record<string, unknown>): PreviewCaptureRow {
  return {
    id: String(row.id),
    email: String(row.email),
    market: String(row.market),
    searchId: row.search_id != null ? String(row.search_id) : null,
    leadCount: Number(row.lead_count ?? 0),
    previewSnapshot: (row.preview_snapshot as PreviewLeadSnapshot[]) ?? [],
    unsubscribeToken: String(row.unsubscribe_token),
    email1SentAt: row.email_1_sent_at ? String(row.email_1_sent_at) : null,
    email2SentAt: row.email_2_sent_at ? String(row.email_2_sent_at) : null,
    email3SentAt: row.email_3_sent_at ? String(row.email_3_sent_at) : null,
    convertedAt: row.converted_at ? String(row.converted_at) : null,
    unsubscribedAt: row.unsubscribed_at ? String(row.unsubscribed_at) : null,
    createdAt: String(row.created_at),
  };
}

function priorityRank(priority: string | null | undefined): number {
  const p = (priority ?? "").toLowerCase();
  if (p === "high") return 0;
  if (p === "medium") return 1;
  return 2;
}

function signalLabel(type: string | null | undefined, reason?: string | null): string {
  const key = (type ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const labels: Record<string, string> = {
    reputation_gap: "Reputation gap",
    no_website: "No website",
    newer_unknown: "Newer unknown",
    established_static: "Established static",
    general_growth: "General growth",
    high_volume_saturation: "High volume saturation",
  };
  if (labels[key]) return labels[key];
  if (reason?.trim()) {
    const short = reason.trim();
    return short.length > 120 ? `${short.slice(0, 120)}…` : short;
  }
  return type?.replace(/_/g, " ") ?? "Growth opportunity";
}

function pitchExcerpt(outreach: string | null | undefined, max = 220): string {
  const text = (outreach ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function buildPreviewSnapshotFromLeads(leads: Lead[], limit = 3): PreviewLeadSnapshot[] {
  const sorted = [...leads].sort((a, b) => {
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    return (Number(b.score) || 0) - (Number(a.score) || 0);
  });

  return sorted.slice(0, limit).map((lead) => ({
    name: lead.name,
    score: Number(lead.score) || 0,
    signal: signalLabel(lead.opportunityType, lead.reason),
    why: (lead.reason ?? "").trim() || signalLabel(lead.opportunityType, lead.reason),
    pitchExcerpt: pitchExcerpt(lead.outreach),
  }));
}

export async function hasPurchasedMarket(email: string, market: string): Promise<boolean> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT 1
       FROM payments p
       INNER JOIN searches s ON s.id = p.search_id
       WHERE LOWER(TRIM(p.email)) = LOWER(TRIM($1))
         AND LOWER(TRIM(s.location)) = LOWER(TRIM($2))
         AND p.status = 'paid'
       LIMIT 1`,
      [normalizeEmail(email), normalizeMarket(market)]
    );
    return res.rowCount !== null && res.rowCount > 0;
  } finally {
    client.release();
  }
}

export type UpsertPreviewCaptureInput = {
  email: string;
  market: string;
  searchId: string;
  leadCount: number;
  previewSnapshot: PreviewLeadSnapshot[];
};

export type UpsertPreviewCaptureResult =
  | { action: "created" | "updated"; row: PreviewCaptureRow; skipEmail1: boolean }
  | { action: "blocked_purchased" };

export async function upsertPreviewCapture(
  input: UpsertPreviewCaptureInput
): Promise<UpsertPreviewCaptureResult> {
  await ensureSchema();
  const email = normalizeEmail(input.email);
  const market = normalizeMarket(input.market);

  if (await hasPurchasedMarket(email, market)) {
    return { action: "blocked_purchased" };
  }

  const client = await getPool().connect();
  try {
    const existing = await client.query(
      `SELECT id, email_1_sent_at, unsubscribe_token
       FROM preview_captures
       WHERE email = $1 AND market = $2`,
      [email, market]
    );

    const token =
      existing.rows[0]?.unsubscribe_token != null
        ? String(existing.rows[0].unsubscribe_token)
        : randomBytes(24).toString("hex");

    const res = await client.query(
      `INSERT INTO preview_captures (
         email, market, search_id, lead_count, preview_snapshot, unsubscribe_token
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (email, market) DO UPDATE SET
         search_id = EXCLUDED.search_id,
         lead_count = EXCLUDED.lead_count,
         preview_snapshot = EXCLUDED.preview_snapshot
       RETURNING *`,
      [email, market, input.searchId, input.leadCount, JSON.stringify(input.previewSnapshot), token]
    );

    const row = mapRow(res.rows[0] as Record<string, unknown>);
    const priorEmail1 = existing.rows[0]?.email_1_sent_at as Date | null | undefined;
    let skipEmail1 = false;
    if (priorEmail1) {
      const hours = (Date.now() - new Date(priorEmail1).getTime()) / (1000 * 60 * 60);
      skipEmail1 = hours < 24;
    }

    return {
      action: existing.rows.length > 0 ? "updated" : "created",
      row,
      skipEmail1,
    };
  } finally {
    client.release();
  }
}

export async function setPreviewEmailSent(
  id: string,
  which: 1 | 2 | 3
): Promise<void> {
  await ensureSchema();
  const col = which === 1 ? "email_1_sent_at" : which === 2 ? "email_2_sent_at" : "email_3_sent_at";
  const client = await getPool().connect();
  try {
    await client.query(`UPDATE preview_captures SET ${col} = NOW() WHERE id = $1`, [id]);
  } finally {
    client.release();
  }
}

export async function markPreviewCapturesConverted(email: string, market: string): Promise<number> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `UPDATE preview_captures
       SET converted_at = NOW()
       WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
         AND LOWER(TRIM(market)) = LOWER(TRIM($2))
         AND converted_at IS NULL`,
      [normalizeEmail(email), normalizeMarket(market)]
    );
    return res.rowCount ?? 0;
  } finally {
    client.release();
  }
}

export async function unsubscribePreviewCapture(token: string): Promise<boolean> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `UPDATE preview_captures
       SET unsubscribed_at = NOW()
       WHERE unsubscribe_token = $1 AND unsubscribed_at IS NULL`,
      [token.trim()]
    );
    return (res.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function listPreviewFollowupCandidates(
  which: 2 | 3,
  limit = 40
): Promise<PreviewCaptureRow[]> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const sql =
      which === 2
        ? `SELECT * FROM preview_captures
           WHERE email_1_sent_at IS NOT NULL
             AND email_1_sent_at <= NOW() - INTERVAL '2 days'
             AND email_2_sent_at IS NULL
             AND converted_at IS NULL
             AND unsubscribed_at IS NULL
           ORDER BY email_1_sent_at ASC
           LIMIT $1`
        : `SELECT * FROM preview_captures
           WHERE email_2_sent_at IS NOT NULL
             AND email_2_sent_at <= NOW() - INTERVAL '3 days'
             AND email_3_sent_at IS NULL
             AND converted_at IS NULL
             AND unsubscribed_at IS NULL
           ORDER BY email_2_sent_at ASC
           LIMIT $1`;
    const res = await client.query(sql, [limit]);
    return res.rows.map((r) => mapRow(r as Record<string, unknown>));
  } finally {
    client.release();
  }
}

export async function getPreviewCaptureByToken(token: string): Promise<PreviewCaptureRow | null> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(`SELECT * FROM preview_captures WHERE unsubscribe_token = $1 LIMIT 1`, [
      token.trim(),
    ]);
    const row = res.rows[0];
    return row ? mapRow(row as Record<string, unknown>) : null;
  } finally {
    client.release();
  }
}
