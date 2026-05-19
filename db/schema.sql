CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan TEXT NOT NULL DEFAULT 'starter_one_time',
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_statuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lead_id)
);

CREATE INDEX IF NOT EXISTS lead_statuses_user_id_idx ON lead_statuses(user_id);
CREATE INDEX IF NOT EXISTS searches_user_id_idx ON searches(user_id);

CREATE TABLE IF NOT EXISTS searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  niche TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  result_count INTEGER DEFAULT 0,
  error_message TEXT,
  is_paid BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  search_id INTEGER NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  place_id TEXT,
  niche TEXT,
  name TEXT NOT NULL,
  address TEXT,
  website TEXT,
  email TEXT,
  primary_email TEXT,
  contact_form_url TEXT,
  email_status TEXT,
  email_source TEXT,
  enrichment_notes TEXT,
  email_rejection_reason TEXT,
  phone TEXT,
  rating NUMERIC,
  review_count INTEGER,
  score INTEGER,
  reason TEXT,
  outreach TEXT,
  opportunity_type TEXT,
  priority TEXT,
  maps_url TEXT,
  primary_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_search_place ON leads(search_id, place_id);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id INTEGER NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_search_id_idx ON payments(search_id);
