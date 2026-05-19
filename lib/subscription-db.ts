import { getPool, ensureSchema } from "@/lib/db";
import type {
  DashboardLead,
  DashboardSearch,
  LeadCrmStatus,
  SubscriptionPlan,
  SubscriptionRow,
  SubscriptionStatus,
} from "@/lib/subscription-types";

export type {
  DashboardLead,
  DashboardSearch,
  LeadCrmStatus,
  SubscriptionPlan,
  SubscriptionRow,
  SubscriptionStatus,
} from "@/lib/subscription-types";
export { LEAD_CRM_STATUSES } from "@/lib/subscription-types";

export async function upsertUserByEmail(email: string, name?: string | null): Promise<{ id: number; email: string }> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `INSERT INTO users (email, name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)
       RETURNING id, email`,
      [email.toLowerCase().trim(), name ?? null]
    );
    const row = res.rows[0];
    return { id: row.id as number, email: row.email as string };
  } finally {
    client.release();
  }
}

export async function getUserById(userId: number): Promise<{ id: number; email: string; name: string | null } | null> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query("SELECT id, email, name FROM users WHERE id = $1", [userId]);
    const row = res.rows[0];
    if (!row) return null;
    return { id: row.id as number, email: row.email as string, name: (row.name as string | null) ?? null };
  } finally {
    client.release();
  }
}

export async function getSubscriptionByUserId(userId: number): Promise<SubscriptionRow | null> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT id, user_id, stripe_customer_id, stripe_subscription_id, status, plan,
              credits_remaining, billing_cycle_start, created_at, updated_at
       FROM subscriptions WHERE user_id = $1`,
      [userId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return mapSubscriptionRow(row);
  } finally {
    client.release();
  }
}

function mapSubscriptionRow(row: Record<string, unknown>): SubscriptionRow {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    stripeCustomerId: row.stripe_customer_id as string,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    status: row.status as SubscriptionStatus,
    plan: row.plan as SubscriptionPlan,
    creditsRemaining: Number(row.credits_remaining ?? 0),
    billingCycleStart: new Date(row.billing_cycle_start as string),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export async function upsertSubscription(params: {
  userId: number;
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  creditsRemaining?: number;
  billingCycleStart?: Date;
  incrementCredits?: number;
}): Promise<SubscriptionRow> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const defaultCredits = params.plan === "pro" ? 3 : 1;
    const creditsOnInsert = params.creditsRemaining ?? defaultCredits;

    if (params.incrementCredits) {
      const res = await client.query(
        `INSERT INTO subscriptions (
           user_id, stripe_customer_id, stripe_subscription_id, status, plan,
           credits_remaining, billing_cycle_start
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
           stripe_customer_id = EXCLUDED.stripe_customer_id,
           status = EXCLUDED.status,
           plan = EXCLUDED.plan,
           credits_remaining = subscriptions.credits_remaining + $8,
           updated_at = NOW()
         RETURNING id, user_id, stripe_customer_id, stripe_subscription_id, status, plan,
                   credits_remaining, billing_cycle_start, created_at, updated_at`,
        [
          params.userId,
          params.stripeCustomerId,
          params.stripeSubscriptionId ?? null,
          params.status,
          params.plan,
          creditsOnInsert,
          params.billingCycleStart ?? new Date(),
          params.incrementCredits,
        ]
      );
      return mapSubscriptionRow(res.rows[0]);
    }

    const res = await client.query(
      `INSERT INTO subscriptions (
         user_id, stripe_customer_id, stripe_subscription_id, status, plan,
         credits_remaining, billing_cycle_start
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
         status = EXCLUDED.status,
         plan = EXCLUDED.plan,
         credits_remaining = COALESCE($8::int, EXCLUDED.credits_remaining),
         billing_cycle_start = COALESCE(EXCLUDED.billing_cycle_start, subscriptions.billing_cycle_start),
         updated_at = NOW()
       RETURNING id, user_id, stripe_customer_id, stripe_subscription_id, status, plan,
                 credits_remaining, billing_cycle_start, created_at, updated_at`,
      [
        params.userId,
        params.stripeCustomerId,
        params.stripeSubscriptionId ?? null,
        params.status,
        params.plan,
        creditsOnInsert,
        params.billingCycleStart ?? new Date(),
        params.creditsRemaining ?? null,
      ]
    );
    return mapSubscriptionRow(res.rows[0]);
  } finally {
    client.release();
  }
}

export async function updateSubscriptionByUserId(
  userId: number,
  data: Partial<{
    status: SubscriptionStatus;
    plan: SubscriptionPlan;
    stripeSubscriptionId: string | null;
    creditsRemaining: number;
    billingCycleStart: Date;
  }>
): Promise<void> {
  await ensureSchema();
  const sets: string[] = ["updated_at = NOW()"];
  const values: unknown[] = [];
  let i = 1;

  if (data.status !== undefined) {
    sets.push(`status = $${i++}`);
    values.push(data.status);
  }
  if (data.plan !== undefined) {
    sets.push(`plan = $${i++}`);
    values.push(data.plan);
  }
  if (data.stripeSubscriptionId !== undefined) {
    sets.push(`stripe_subscription_id = $${i++}`);
    values.push(data.stripeSubscriptionId);
  }
  if (data.creditsRemaining !== undefined) {
    sets.push(`credits_remaining = $${i++}`);
    values.push(data.creditsRemaining);
  }
  if (data.billingCycleStart !== undefined) {
    sets.push(`billing_cycle_start = $${i++}`);
    values.push(data.billingCycleStart);
  }

  values.push(userId);
  const client = await getPool().connect();
  try {
    await client.query(`UPDATE subscriptions SET ${sets.join(", ")} WHERE user_id = $${i}`, values);
  } finally {
    client.release();
  }
}

export async function decrementSearchCredit(userId: number): Promise<boolean> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `UPDATE subscriptions
       SET credits_remaining = credits_remaining - 1, updated_at = NOW()
       WHERE user_id = $1 AND credits_remaining > 0 AND status = 'active'
       RETURNING credits_remaining`,
      [userId]
    );
    return (res.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

export async function getExistingPracticeIdsForUser(userId: number): Promise<Set<string>> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT DISTINCT l.place_id
       FROM leads l
       INNER JOIN searches s ON s.id = l.search_id
       WHERE s.user_id = $1 AND l.place_id IS NOT NULL`,
      [userId]
    );
    return new Set(res.rows.map((r) => r.place_id as string).filter(Boolean));
  } finally {
    client.release();
  }
}

export async function createSearchForUser(userId: number, niche: string, location: string): Promise<number> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `INSERT INTO searches (user_id, niche, location, status, result_count, is_paid)
       VALUES ($1, $2, $3, 'pending', 0, false)
       RETURNING id`,
      [userId, niche, location]
    );
    return res.rows[0].id as number;
  } finally {
    client.release();
  }
}

export async function markSearchPaidForUser(searchId: number, userId: number): Promise<void> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query(
      `UPDATE searches SET is_paid = true WHERE id = $1 AND user_id = $2`,
      [searchId, userId]
    );
  } finally {
    client.release();
  }
}

export async function getDashboardSearches(userId: number): Promise<DashboardSearch[]> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const searchesRes = await client.query(
      `SELECT id, niche, location, result_count, is_paid, created_at
       FROM searches WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const searches: DashboardSearch[] = [];
    for (const s of searchesRes.rows) {
      const leadsRes = await client.query(
        `SELECT l.id, l.place_id, l.name, l.score, l.opportunity_type, l.priority, l.reason, l.outreach,
                l.primary_email, l.contact_form_url, l.phone,
                ls.status AS crm_status, ls.note AS crm_note
         FROM leads l
         LEFT JOIN lead_statuses ls ON ls.lead_id = l.id AND ls.user_id = $2
         WHERE l.search_id = $1
         ORDER BY l.score DESC NULLS LAST`,
        [s.id, userId]
      );

      searches.push({
        id: s.id as number,
        niche: s.niche as string,
        location: s.location as string,
        leadCount: Number(s.result_count ?? 0),
        isPaid: Boolean(s.is_paid),
        createdAt: new Date(s.created_at as string).toISOString(),
        leads: leadsRes.rows.map((r) => ({
          id: r.id as number,
          placeId: r.place_id as string,
          name: r.name as string,
          score: r.score !== null ? Number(r.score) : null,
          opportunityType: (r.opportunity_type as string | null) ?? null,
          priority: (r.priority as string | null) ?? null,
          reason: (r.reason as string | null) ?? null,
          outreach: (r.outreach as string | null) ?? null,
          primaryEmail: (r.primary_email as string | null) ?? null,
          contactFormUrl: (r.contact_form_url as string | null) ?? null,
          phone: (r.phone as string | null) ?? null,
          crmStatus: (r.crm_status as LeadCrmStatus) ?? "new",
          crmNote: (r.crm_note as string | null) ?? null,
        })),
      });
    }
    return searches;
  } finally {
    client.release();
  }
}

export async function upsertLeadStatus(params: {
  userId: number;
  leadId: number;
  status: LeadCrmStatus;
  note?: string | null;
}): Promise<{ status: LeadCrmStatus; note: string | null; updatedAt: string }> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const owned = await client.query(
      `SELECT l.id FROM leads l
       INNER JOIN searches s ON s.id = l.search_id
       WHERE l.id = $1 AND s.user_id = $2`,
      [params.leadId, params.userId]
    );
    if (!owned.rows[0]) {
      throw new Error("Lead not found");
    }

    const res = await client.query(
      `INSERT INTO lead_statuses (user_id, lead_id, status, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, lead_id) DO UPDATE SET
         status = EXCLUDED.status,
         note = EXCLUDED.note,
         updated_at = NOW()
       RETURNING status, note, updated_at`,
      [params.userId, params.leadId, params.status, params.note ?? null]
    );
    const row = res.rows[0];
    return {
      status: row.status as LeadCrmStatus,
      note: (row.note as string | null) ?? null,
      updatedAt: new Date(row.updated_at as string).toISOString(),
    };
  } finally {
    client.release();
  }
}

export async function getSubscriptionByStripeCustomerId(
  stripeCustomerId: string
): Promise<SubscriptionRow | null> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `SELECT id, user_id, stripe_customer_id, stripe_subscription_id, status, plan,
              credits_remaining, billing_cycle_start, created_at, updated_at
       FROM subscriptions WHERE stripe_customer_id = $1`,
      [stripeCustomerId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return mapSubscriptionRow(row);
  } finally {
    client.release();
  }
}
