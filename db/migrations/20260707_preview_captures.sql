-- Preview email capture + follow-up sequence (Neon Postgres)
-- Manual run: psql "$DATABASE_URL" -f db/migrations/20260707_preview_captures.sql
-- Or: start the app / hit any API that calls ensureSchema() in lib/db.ts (same DDL).

CREATE TABLE IF NOT EXISTS preview_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  market TEXT NOT NULL,
  search_id TEXT,
  lead_count INTEGER NOT NULL DEFAULT 0,
  preview_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  email_1_sent_at TIMESTAMPTZ,
  email_2_sent_at TIMESTAMPTZ,
  email_3_sent_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT preview_captures_email_market_unique UNIQUE (email, market)
);

CREATE INDEX IF NOT EXISTS preview_captures_followup_1_idx
  ON preview_captures (email_1_sent_at)
  WHERE email_2_sent_at IS NULL AND converted_at IS NULL AND unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS preview_captures_followup_2_idx
  ON preview_captures (email_2_sent_at)
  WHERE email_3_sent_at IS NULL AND converted_at IS NULL AND unsubscribed_at IS NULL;
