-- Stripe webhook idempotency + pack delivery tracking (safe to run multiple times).
-- Applied automatically on deploy via lib/db.ts ensureSchema(); run this script
-- against production Neon before deploying code that depends on these objects.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS pack_delivery_email_sent_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pack_delivery_in_progress_at TIMESTAMPTZ;
