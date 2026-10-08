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

export function formatEmailBulletLine(name: string, reason: string, maxWords = 25): string {
  let r = reason.trim();
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

export function formatAdminSampleEmailBullets(leads: AdminSampleLead[], count = 3): string {
  return leads
    .slice(0, count)
    .map((l) => formatEmailBulletLine(l.name, l.emailCopyReason))
    .join("\n");
}
