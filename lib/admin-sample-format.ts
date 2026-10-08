/** Client-safe types and copy helpers for /admin/sample (no server imports). */

export type AdminSampleLead = {
  name: string;
  score: number;
  tier: string;
  whyThisLead: string;
  bestContactMethod: string;
  pitchAngle: string;
  opportunityType: string;
  address: string | null;
  emailCopyReason: string;
};

function marketCityLabel(market: string | undefined): string {
  if (!market?.trim()) return "your market";
  const city = market.split(",")[0]?.trim();
  return city || "your market";
}

/** Paste-ready wording for /admin/sample Copy buttons (not table “why this lead”). */
export function normalizeAdminSampleCopyReason(reason: string, market?: string): string {
  const city = marketCityLabel(market);
  let r = reason.trim();
  r = r.replace(
    /\bvs\. a ([\d.]+) local median among [^.]+(?:\.|$)/gi,
    `vs. a $1 average for ${city} practices`
  );
  r = r.replace(/\bin this run\b/gi, `for ${city} practices`);
  r = r.replace(new RegExp(`for ${city} practices for ${city} practices`, "gi"), `for ${city} practices`);
  return r.replace(/\s+/g, " ").trim();
}

function capitalizeReasonStart(reason: string): string {
  const r = reason.trim();
  if (!r) return r;
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export function formatEmailBulletLine(
  name: string,
  reason: string,
  maxWords = 25,
  market?: string
): string {
  let r = capitalizeReasonStart(normalizeAdminSampleCopyReason(reason, market));
  let line = `• ${name}: ${r}`;
  let words = line.split(/\s+/).filter(Boolean);
  while (words.length > maxWords && r.includes(" ")) {
    r = r.replace(/\s+\S+$/, "").replace(/[,;—-]+$/, "");
    line = `• ${name}: ${r}`;
    words = line.split(/\s+/).filter(Boolean);
  }
  if (words.length > maxWords) {
    line = words.slice(0, maxWords).join(" ");
  }
  return line;
}

export function formatAdminSampleEmailBullets(
  leads: AdminSampleLead[],
  count = 3,
  market?: string
): string {
  return leads
    .slice(0, count)
    .map((l) => formatEmailBulletLine(l.name, l.emailCopyReason, 25, market))
    .join("\n");
}
