import { Pool, PoolClient } from "pg";
import { ExportLeadRow, Lead, SearchWithLeads } from "@/lib/types";

let pool: Pool | null = null;

function isConnectionError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
  return (
    message.includes("not queryable") ||
    message.includes("Connection terminated unexpectedly") ||
    message.includes("ECONNRESET") ||
    message.includes("socket hang up")
  );
}

async function resetPool(reason: string) {
  if (!pool) return;
  const oldPool = pool;
  pool = null;
  try {
    await oldPool.end();
  } catch (error) {
    console.warn("[db] pool reset warning", {
      reason,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Use before calling DB from Server Components to avoid throwing generic production errors. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
    });
    pool.on("error", (error) => {
      console.error("[db] unexpected idle client error", error);
    });
  }
  return pool;
}

export async function ensureSchema() {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const client = await getPool().connect();
    let releasedHard = false;
    try {
      await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS searches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        niche TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        result_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
        phone TEXT,
        rating NUMERIC,
        review_count INTEGER,
        score INTEGER,
        reason TEXT,
        outreach TEXT,
        maps_url TEXT,
        primary_type TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        status TEXT DEFAULT 'new',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Backfill for existing DBs.
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS place_id TEXT;`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS niche TEXT;`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS address TEXT;`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS maps_url TEXT;`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS primary_type TEXT;`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach TEXT;`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
    await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';`);

    await client.query(`ALTER TABLE searches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';`);
    await client.query(`ALTER TABLE searches ADD COLUMN IF NOT EXISTS result_count INTEGER DEFAULT 0;`);
    await client.query(`ALTER TABLE searches ADD COLUMN IF NOT EXISTS error_message TEXT;`);
    await client.query(`ALTER TABLE searches ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        search_id INTEGER NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
        stripe_session_id TEXT NOT NULL UNIQUE,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS leads_unique_search_place ON leads(search_id, place_id);`);
      return;
    } catch (error) {
      const retryable = isConnectionError(error);
      if (retryable && attempt === 1) {
        client.release(true);
        releasedHard = true;
        await resetPool("retrying ensureSchema after connection failure");
        continue;
      }
      throw error;
    } finally {
      if (!releasedHard) {
        client.release();
      }
    }
  }
}

export async function createSearch(niche: string, location: string) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let client: PoolClient | null = null;
    let releasedHard = false;
    try {
      await ensureSchema();
      client = await getPool().connect();
      const searchRes = await client.query(
        "INSERT INTO searches (niche, location, status, result_count) VALUES ($1, $2, 'pending', 0) RETURNING id",
        [niche, location]
      );
      return searchRes.rows[0].id as number;
    } catch (error) {
      const retryable = isConnectionError(error);
      if (retryable && attempt === 1) {
        if (client) {
          client.release(true);
          releasedHard = true;
        }
        await resetPool("retrying createSearch after connection failure");
        continue;
      }
      throw error;
    } finally {
      if (client && !releasedHard) {
        client.release();
      }
    }
  }
  throw new Error("Failed to create search after retries.");
}

export async function setSearchStatus(
  searchId: number,
  status: "pending" | "completed" | "failed",
  options?: { errorMessage?: string | null; resultCount?: number }
) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const client = await getPool().connect();
    let releasedHard = false;
    try {
      await client.query(
        "UPDATE searches SET status = $1, error_message = $2, result_count = COALESCE($3, result_count) WHERE id = $4",
        [status, options?.errorMessage ?? null, options?.resultCount ?? null, searchId]
      );
      return;
    } catch (error) {
      const retryable = isConnectionError(error);
      if (retryable && attempt === 1) {
        client.release(true);
        releasedHard = true;
        await resetPool("retrying setSearchStatus after connection failure");
        continue;
      }
      throw error;
    } finally {
      if (!releasedHard) {
        client.release();
      }
    }
  }
}

export async function insertLeads(searchId: number, leads: Lead[]): Promise<number> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const client = await getPool().connect();
    let releasedHard = false;
    try {
      await client.query("BEGIN");
      for (const lead of leads) {
        await client.query(
          `INSERT INTO leads
            (search_id, place_id, niche, name, website, email, phone, rating, review_count, score, reason, outreach, address, maps_url, primary_type, metadata, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (search_id, place_id) DO NOTHING`,
          [
            searchId,
            lead.placeId,
            lead.niche ?? null,
            lead.name,
            lead.website,
            lead.email,
            lead.phone,
            lead.rating,
            lead.reviewCount,
            lead.score ?? null,
            lead.reason ?? null,
            lead.outreach ?? null,
            lead.address,
            lead.mapsUrl,
            lead.primaryType,
            lead.metadata ?? {},
            lead.status ?? "new",
          ]
        );
      }
      await client.query("COMMIT");
      return leads.length;
    } catch (error) {
      let rollbackError: unknown = null;
      try {
        await client.query("ROLLBACK");
      } catch (rbError) {
        rollbackError = rbError;
      }

      const retryable = isConnectionError(error) || isConnectionError(rollbackError);
      console.error("[db] insertLeads failed", {
        searchId,
        attempt,
        attemptedCount: leads.length,
        retryable,
        error: error instanceof Error ? error.message : String(error),
        rollbackError:
          rollbackError instanceof Error ? rollbackError.message : rollbackError ? String(rollbackError) : null,
      });

      if (retryable && attempt === 1) {
        client.release(true);
        releasedHard = true;
        await resetPool("retrying insertLeads after connection failure");
        continue;
      }

      throw error;
    } finally {
      if (!releasedHard) {
        client.release();
      }
    }
  }

  return 0;
}

export async function getSearchWithLeads(searchId: number): Promise<SearchWithLeads | null> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await ensureSchema();
    const client = await getPool().connect();
    let releasedHard = false;
    try {
      const searchRes = await client.query(
        "SELECT id, niche, location, status, result_count, error_message, is_paid, created_at FROM searches WHERE id = $1",
        [searchId]
      );
      const search = searchRes.rows[0];
      if (!search) return null;

      const leadsRes = await client.query(
        "SELECT place_id, niche, name, address, website, email, phone, rating, review_count, score, reason, outreach, maps_url, primary_type, metadata, status, created_at FROM leads WHERE search_id = $1 ORDER BY score DESC NULLS LAST",
        [searchId]
      );

      const leads: Lead[] = leadsRes.rows.map((r: any) => ({
        placeId: r.place_id,
        niche: r.niche ?? null,
        name: r.name,
        address: r.address ?? null,
        website: r.website ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        rating: r.rating !== null ? Number(r.rating) : null,
        reviewCount: r.review_count ?? null,
        primaryType: r.primary_type ?? null,
        mapsUrl: r.maps_url ?? null,
        score: r.score ?? undefined,
        reason: r.reason ?? undefined,
        outreach: r.outreach ?? undefined,
        status: r.status ?? undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
        metadata: r.metadata ?? {},
      }));

      return {
        id: search.id as number,
        niche: search.niche as string,
        location: search.location as string,
        status: search.status as string,
        resultCount: Number(search.result_count ?? 0),
        errorMessage: search.error_message as string | null,
        isPaid: Boolean(search.is_paid),
        createdAt: search.created_at ? new Date(search.created_at).toISOString() : undefined,
        leads,
      };
    } catch (error) {
      const retryable = isConnectionError(error);
      if (retryable && attempt === 1) {
        client.release(true);
        releasedHard = true;
        await resetPool("retrying getSearchWithLeads after connection failure");
        continue;
      }
      throw error;
    } finally {
      if (!releasedHard) {
        client.release();
      }
    }
  }
  throw new Error("Failed to load search after retries.");
}

export async function getSearchForExport(searchId: number): Promise<{
  search: SearchWithLeads | null;
  rows: ExportLeadRow[];
}> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const searchRes = await client.query(
      "SELECT id, niche, location, status, result_count, error_message, is_paid, created_at FROM searches WHERE id = $1",
      [searchId]
    );
    const row = searchRes.rows[0];
    if (!row) return { search: null, rows: [] };

    const search: SearchWithLeads = {
      id: row.id as number,
      niche: row.niche as string,
      location: row.location as string,
      status: row.status as string,
      resultCount: Number(row.result_count ?? 0),
      errorMessage: (row.error_message as string | null) ?? null,
      isPaid: Boolean(row.is_paid),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      leads: [],
    };

    const leadsRes = await client.query(
      `SELECT
         name, address, website, phone, email, rating, review_count, score, reason, outreach, primary_type, maps_url, created_at
       FROM leads
       WHERE search_id = $1
       ORDER BY score DESC NULLS LAST, created_at DESC`,
      [searchId]
    );

    const rows: ExportLeadRow[] = leadsRes.rows.map((r: any) => ({
      name: r.name ?? null,
      address: r.address ?? null,
      website: r.website ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      rating: r.rating !== null && r.rating !== undefined ? Number(r.rating) : null,
      review_count: r.review_count ?? null,
      score: r.score ?? null,
      reason: r.reason ?? null,
      outreach: r.outreach ?? null,
      primary_type: r.primary_type ?? null,
      maps_url: r.maps_url ?? null,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    }));

    return { search, rows };
  } finally {
    client.release();
  }
}

export async function getRecentSearches(limit = 20) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT
         s.id,
         s.niche,
         s.location,
         s.status,
         s.result_count,
         s.error_message,
         s.created_at,
         COUNT(l.id) AS leads_count
       FROM searches s
       LEFT JOIN leads l ON l.search_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return res.rows.map((r: any) => ({
      id: r.id as number,
      niche: r.niche as string,
      location: r.location as string,
      status: r.status as string,
      resultCount: Number(r.result_count ?? 0),
      errorMessage: r.error_message as string | null,
      createdAt: r.created_at as Date,
      leadsCount: Number(r.leads_count ?? 0),
    }));
  } finally {
    client.release();
  }
}

export async function getRecentLeads(limit = 50) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT
         id,
         search_id,
         niche,
         name,
         primary_type,
         phone,
         website,
         score,
         reason,
         outreach,
         status,
         created_at
       FROM leads
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows.map((r: any) => ({
      id: r.id as number,
      searchId: r.search_id as number,
      niche: (r.niche as string | null) ?? null,
      name: r.name as string,
      primaryType: (r.primary_type as string | null) ?? null,
      phone: (r.phone as string | null) ?? null,
      website: (r.website as string | null) ?? null,
      score: r.score as number | null,
      reason: r.reason as string | null,
      outreach: r.outreach as string | null,
      status: r.status as string | null,
      createdAt: r.created_at as Date,
    }));
  } finally {
    client.release();
  }
}

export async function getSearchRowForPayment(
  searchId: number
): Promise<{ id: number; isPaid: boolean } | null> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query("SELECT id, is_paid FROM searches WHERE id = $1", [searchId]);
    const row = res.rows[0];
    if (!row) return null;
    return { id: row.id as number, isPaid: Boolean(row.is_paid) };
  } finally {
    client.release();
  }
}

export async function markSearchPaidFromStripe(params: {
  searchId: number;
  stripeSessionId: string;
  amount: number;
  status: string;
  email: string | null;
}): Promise<void> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE searches SET is_paid = true WHERE id = $1", [params.searchId]);
    await client.query(
      `INSERT INTO payments (search_id, stripe_session_id, amount, status, email)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (stripe_session_id) DO NOTHING`,
      [params.searchId, params.stripeSessionId, params.amount, params.status, params.email]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
