-- Unguessable CSV export tokens on payments (safe to run multiple times).

ALTER TABLE payments ADD COLUMN IF NOT EXISTS pack_download_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payments_pack_download_token_key
  ON payments (pack_download_token)
  WHERE pack_download_token IS NOT NULL;
