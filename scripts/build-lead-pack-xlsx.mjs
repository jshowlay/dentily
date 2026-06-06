// Rebuild the Dallas dental lead pack into a formatted .xlsx.
//   node scripts/build-lead-pack-xlsx.mjs
//
// Reads the exported CSV, fixes the known column problems (unique outreach/
// voicemail copy, populated Why Now, re-derived readiness, human-readable
// rejection reasons, dropped noise columns), reorders + sorts, and writes a
// styled workbook with a "Leads" sheet and a "How To Use" sheet.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";

const INPUT = path.join(os.homedir(), "Downloads", "dentily-dallas-dental-leads-122.csv");
const OUTPUT = path.join(os.homedir(), "Downloads", "dentily-dallas-dental-leads-IMPROVED.xlsx");

const INSTRUCTION_NAME = "--- HOW TO USE THIS PACK ---";

// ---------- helpers ----------
function num(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function intOrNull(v) {
  const n = num(v);
  return n === null ? null : Math.round(n);
}
function reviewsText(n) {
  return n === null ? "a limited number of" : String(n);
}
function ratingText(n) {
  return n === null ? "its current rating" : String(n);
}

// ---------- transforms ----------
function buildWhyNow(oppType, reviews, rating) {
  const rc = reviews ?? 0;
  if (oppType === "High Volume Saturation") {
    return "Saturated profile — low acquisition priority; flag for referral/overflow routing only.";
  }
  if (rc < 100) {
    return "Thin review profile — early-stage window before a competitor dominates local Maps.";
  }
  if (rc >= 100 && rc <= 500) {
    if ((rating ?? 0) >= 4.5) {
      return "Strong rating with mid-volume reviews — now is when paid acquisition converts efficiently.";
    }
    return "Mid-tier review count with sub-4.5 rating — reputation improvement + visibility push has compounding ROI now.";
  }
  // rc > 500, not saturated
  return "Established authority — ads and SEO can leverage existing trust signal for patient volume growth.";
}

function buildWhyThisLead(name, oppType, reviews, rating) {
  const r = reviewsText(reviews);
  const st = ratingText(rating);
  switch (oppType) {
    case "Newer Unknown":
      return `${name} has only ${r} reviews — the profile is thin relative to established Dallas peers. Reputation-building plus a small paid budget could move the needle fast.`;
    case "General Growth":
      return `${name} shows ${r} reviews at ${st} stars. The foundation is solid but the listing isn't converting at its potential. Paid ads + Maps optimization is the clear next lever.`;
    case "Established Static":
      return `${name} has ${r} reviews and ${st} stars but no visible growth trajectory. The social proof is there — new patient volume just isn't tracking with it.`;
    case "High Volume Saturation":
      return `${name} is at ${r} reviews — effectively maxed for acquisition pressure. Flag for referral routing or overflow. Don't pitch ads.`;
    default:
      return `${name} shows ${r} reviews at ${st} stars — a solid foundation with room to convert local visibility into more booked patients.`;
  }
}

function buildOutreachBody(name, oppType, reviews, rating, variant) {
  const r = reviewsText(reviews);
  const st = ratingText(rating);
  const v = variant % 2;
  switch (oppType) {
    case "Newer Unknown":
      return v === 0
        ? `At ${r} reviews, ${name} is still in the window where every new review visibly moves your Maps ranking. Right now you're early enough to own that local placement before an established competitor pushes for it.`
        : `${name} is sitting at ${r} reviews, which is thin next to the established Dallas offices ranking above you. That's the opening: at this stage a focused review and visibility push compounds far faster than it will a year from now.`;
    case "General Growth":
      return v === 0
        ? `${name} is at ${st} stars across ${r} reviews — patients clearly like you, but a profile that strong should be pulling more volume than it likely is. The gap is usually Maps visibility, not reputation. What feels off between your listing and your actual week?`
        : `With ${r} reviews at ${st} stars, ${name} has the proof but probably not the Maps real estate to match it. That gap between how good the profile looks and how many new patients it sends is exactly where paid plus local SEO earns its keep.`;
    case "Established Static":
      return v === 0
        ? `${name} has built real authority — ${r} reviews at ${st} stars — but a profile this established should be compounding new-patient volume rather than holding flat. Usually that's a conversion and visibility gap, not a trust one. What's keeping volume steady despite the strong profile?`
        : `${r} reviews at ${st} stars puts ${name} well past the trust threshold, yet the growth motion looks stalled. The social proof is done; the real lever now is converting it into booked new patients.`;
    case "High Volume Saturation":
      return v === 0
        ? `${name} is effectively maxed at ${r} reviews — you don't need more acquisition pressure. The more useful question at your scale is overflow: where do calls go when the calendar is full, and is referral routing actually capturing them?`
        : `At ${r} reviews, ${name} is saturated for ads — so this isn't a growth pitch. Practices at your volume usually leak value on overflow and hiring handoffs, and that's the angle worth a quick look.`;
    default:
      return `${name} shows ${r} reviews at ${st} stars. There's a clear gap between how the listing looks and how many new patients it brings in, and that's the first thing I'd test.`;
  }
}

function buildOutreachDraft(body) {
  return [
    "{{your_name}} here, from {{your_company}}. {{your_credibility_line}}",
    "",
    body,
    "",
    "I will send a 2-minute Loom on the first change I would test. Reply [yes/Loom/send it]. No call required.",
    "",
    "— {{your_name}}",
  ].join("\n");
}

function buildVoicemail(name, oppType, reviews, rating) {
  const r = reviewsText(reviews);
  const st = ratingText(rating);
  let detail;
  switch (oppType) {
    case "Newer Unknown":
      detail = `sitting at ${st} stars with ${r} reviews — I had an idea about closing the review gap with nearby Dallas practices while you're still early`;
      break;
    case "General Growth":
      detail = `at ${st} stars with ${r} reviews, and I noticed a gap between how you rank on Maps and how strong your profile actually is`;
      break;
    case "Established Static":
      detail = `at ${r} reviews and ${st} stars — strong profile, but I had one specific thought on why new-patient volume might be sitting flat`;
      break;
    case "High Volume Saturation":
      detail = `at ${r} reviews — you're clearly established, so this isn't a pitch; I just had a thought on handling overflow and referrals`;
      break;
    default:
      detail = `at ${st} stars with ${r} reviews, and I had one specific observation about how you show up locally`;
  }
  return `Hi ${name}, this is {{your_name}} from {{your_company}}. Quick one — I noticed your Dallas Maps listing is ${detail}. Callback whenever works. Thanks.`;
}

function translateRejection(raw) {
  const s = (raw || "").trim();
  if (s === "tld_artifact") return "Email likely generic/catch-all — low deliverability";
  if (s === "script_or_vendor_token") return "Detected as script/vendor email — not a real inbox";
  return s; // blank stays blank
}

function deriveReadiness(primaryEmail, contactForm, bestContact, priority) {
  const hasEmail = Boolean((primaryEmail || "").trim());
  const hasForm = Boolean((contactForm || "").trim());
  const pri = (priority || "").trim().toLowerCase();
  if (hasEmail && pri === "high") return "High";
  if (hasForm || pri === "medium") return "Medium";
  if (bestContact === "Phone (no digital path)" && pri === "low") return "Low";
  return "Medium";
}

const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };

// ---------- main ----------
const raw = fs.readFileSync(INPUT, "utf8");
let rows = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true });
rows = rows.filter((r) => (r.Name || "").trim() && r.Name !== INSTRUCTION_NAME);

const leads = rows.map((r, idx) => {
  const name = (r.Name || "").trim();
  const oppType = (r["Opportunity Type"] || "").trim();
  const reviews = intOrNull(r["Review Count"]);
  const rating = num(r.Rating);
  const priority = (r.Priority || "").trim();
  const bestContact = (r["Best Contact Method"] || "").trim();
  const body = buildOutreachBody(name, oppType, reviews, rating, idx);
  const isPhoneOnly = bestContact === "Phone (no digital path)";

  return {
    "Top Lead": (r["Top Lead"] || "No").trim() || "No",
    Priority: priority,
    Score: num(r.Score),
    Name: name,
    "Opportunity Type": oppType,
    "Action Tier": (r["Action Tier"] || "").trim(),
    "Outreach Readiness": deriveReadiness(r["Primary Email"], r["Contact Form URL"], bestContact, priority),
    "Why This Lead": buildWhyThisLead(name, oppType, reviews, rating),
    "Why Now": buildWhyNow(oppType, reviews, rating),
    "Best Contact Method": bestContact,
    "Primary Email": (r["Primary Email"] || "").trim(),
    "Contact Form URL": (r["Contact Form URL"] || "").trim(),
    Phone: (r.Phone || "").trim(),
    "Voicemail Script": isPhoneOnly ? buildVoicemail(name, oppType, reviews, rating) : "",
    "Outreach Draft (customize before sending)": buildOutreachDraft(body),
    "Send Status": "Not Sent",
    Address: (r.Address || "").trim(),
    Website: (r.Website || "").trim(),
    "Maps URL": (r["Maps URL"] || "").trim(),
    Rating: rating,
    "Review Count": reviews,
    "Estimated Opportunity": (r["Estimated Opportunity"] || "").trim(),
    "Reachability Score": num(r["Reachability Score"]),
    Contactable: (r.Contactable || "").trim(),
    "Cluster Notes": (r["Cluster Notes"] || "").trim(),
    "Email Status": (r["Email Status"] || "").trim(),
    "Email Source": (r["Email Source"] || "").trim(),
    "Email Rejection Reason": translateRejection(r["Email Rejection Reason"]),
    "Enrichment Notes": (r["Enrichment Notes"] || "").trim(),
    "Other Emails": (r["Other Emails"] || "").trim(),
    Reason: (r.Reason || "").trim(),
    __body: body,
  };
});

// Sort: Priority High→Med→Low, then Score desc.
leads.sort((a, b) => {
  const pr = (PRIORITY_RANK[b.Priority.toLowerCase()] || 0) - (PRIORITY_RANK[a.Priority.toLowerCase()] || 0);
  if (pr !== 0) return pr;
  return (b.Score ?? -Infinity) - (a.Score ?? -Infinity);
});

const COLUMNS = [
  "Top Lead", "Priority", "Score", "Name", "Opportunity Type", "Action Tier",
  "Outreach Readiness", "Why This Lead", "Why Now", "Best Contact Method",
  "Primary Email", "Contact Form URL", "Phone", "Voicemail Script",
  "Outreach Draft (customize before sending)", "Send Status", "Address",
  "Website", "Maps URL", "Rating", "Review Count", "Estimated Opportunity",
  "Reachability Score", "Contactable", "Cluster Notes", "Email Status",
  "Email Source", "Email Rejection Reason", "Enrichment Notes", "Other Emails",
  "Reason",
];

const WIDms = {
  Name: 35,
  "Outreach Draft (customize before sending)": 60,
  "Voicemail Script": 50,
  "Why This Lead": 55,
  "Why Now": 50,
};
const WRAP_COLS = new Set([
  "Outreach Draft (customize before sending)",
  "Voicemail Script",
  "Why This Lead",
  "Why Now",
]);

// ---------- validation ----------
function assert(cond, msg) {
  if (!cond) {
    console.error(`VALIDATION FAILED: ${msg}`);
    process.exit(1);
  }
}
assert(leads.length === 149, `Row count == 149 (got ${leads.length})`);
assert(leads.every((l) => l["Why Now"].trim()), "Why Now has 0 blank values");
assert(leads.every((l) => l["Send Status"] === "Not Sent"), "Send Status all 'Not Sent'");
assert(!COLUMNS.includes("Apollo Enrichment"), "Apollo Enrichment removed");
assert(!COLUMNS.includes("Placeholders Remaining"), "Placeholders Remaining removed");
assert(leads.every((l) => l["Top Lead"] === "Yes" || l["Top Lead"] === "No"), "Top Lead is Yes/No");
const bodies = leads.map((l) => l.__body);
const dupBodies = bodies.length - new Set(bodies).size;
assert(dupBodies === 0, `Duplicate outreach hooks: ${dupBodies}`);

// ---------- summary ----------
const cnt = (pred) => leads.filter(pred).length;
const high = cnt((l) => l.Priority.toLowerCase() === "high");
const med = cnt((l) => l.Priority.toLowerCase() === "medium");
const low = cnt((l) => l.Priority.toLowerCase() === "low");
const emailReach = cnt((l) => l["Primary Email"]);
const formReach = cnt((l) => !l["Primary Email"] && l["Contact Form URL"]);
const phoneOnly = cnt((l) => l["Best Contact Method"] === "Phone (no digital path)");
const rHigh = cnt((l) => l["Outreach Readiness"] === "High");
const rMed = cnt((l) => l["Outreach Readiness"] === "Medium");
const rLow = cnt((l) => l["Outreach Readiness"] === "Low");

console.log(`Leads: ${leads.length}`);
console.log(`High Priority: ${high} | Medium: ${med} | Low: ${low}`);
console.log(`Top Leads: ${cnt((l) => l["Top Lead"] === "Yes")}`);
console.log(`Email reachable: ${emailReach} | Form reachable: ${formReach} | Phone only: ${phoneOnly}`);
console.log(`Why Now populated: ${cnt((l) => l["Why Now"].trim())}/${leads.length}`);
console.log(`Outreach Readiness — High: ${rHigh} | Medium: ${rMed} | Low: ${rLow}`);
console.log(`Duplicate outreach hooks: ${dupBodies}`);

// ---------- write workbook ----------
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Leads", { views: [{ state: "frozen", ySplit: 1 }] });

ws.columns = COLUMNS.map((c) => ({ header: c, key: c, width: WIDms[c] ?? 20 }));

// Header style
const headerRow = ws.getRow(1);
headerRow.height = 22;
headerRow.eachCell((cell) => {
  cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E2D40" } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
});

const NUMERIC = new Set(["Score", "Rating", "Review Count", "Reachability Score"]);

for (const lead of leads) {
  const rowValues = {};
  for (const c of COLUMNS) {
    const v = lead[c];
    rowValues[c] = NUMERIC.has(c) ? (v === null || v === undefined ? null : v) : v ?? "";
  }
  const row = ws.addRow(rowValues);
  row.height = 80;

  const isGold = lead["Top Lead"] === "Yes";
  const isHigh = lead.Priority.toLowerCase() === "high";
  const fillArgb = isGold ? "FFFFF3CD" : isHigh ? "FFFFE0E0" : null;

  row.eachCell((cell, colNumber) => {
    const colName = COLUMNS[colNumber - 1];
    cell.font = { name: "Arial", size: 10 };
    cell.alignment = WRAP_COLS.has(colName)
      ? { wrapText: true, vertical: "top" }
      : { vertical: "top", wrapText: false };
    if (fillArgb) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
    }
  });
}

// ---------- How To Use sheet ----------
const howto = wb.addWorksheet("How To Use");
howto.getColumn(1).width = 110;
const HOWTO_LINES = [
  "DENTILY DALLAS DENTAL LEADS — HOW TO USE THIS PACK",
  "",
  "BEFORE YOU SEND:",
  "1. Replace {{your_name}}, {{your_company}}, and {{your_credibility_line}} in every Outreach Draft and Voicemail Script cell.",
  "   Example credibility lines:",
  '   - "I run a dental SEO agency and have worked with 12 practices in the last two years."',
  '   - "I do paid ads for healthcare practices — my last dental client cut their cost-per-new-patient by 40%."',
  '   - "I help local service businesses show up on Google Maps — dentistry is one of my specialties."',
  "",
  "WORKING THE LIST:",
  "2. Sort by Priority (High first), then Score descending. The sheet is pre-sorted this way.",
  "3. Start with Email leads (Primary Email column filled) before Contact Form leads.",
  "4. For Phone-only leads, use the Voicemail Script column. Call once, leave a voicemail, follow up once more max.",
  '5. Update Send Status as you go: "Not Sent" → "Sent" → "Replied" → "Closed"',
  "",
  "LEAD TIERS:",
  "- Tier 1: Ready to Contact — email or contact form on file, send now",
  "- Tier 2: Call First — no digital path, call before emailing",
  "- Top Lead (gold rows) — highest-confidence opportunities, prioritize these first",
  "",
  "SCORING:",
  "- Score is 0–100 based on rating, review count, reachability, and opportunity fit",
  "- High Volume Saturation leads (score < 15) are low-priority — don't pitch ads to these",
];
HOWTO_LINES.forEach((line, i) => {
  const cell = howto.getCell(`A${i + 1}`);
  cell.value = line;
  cell.alignment = { wrapText: true, vertical: "top" };
  if (i === 0) cell.font = { name: "Arial", size: 13, bold: true };
  else if (/^[A-Z ]+:$/.test(line.trim())) cell.font = { name: "Arial", size: 11, bold: true };
  else cell.font = { name: "Arial", size: 10 };
});

await wb.xlsx.writeFile(OUTPUT);
console.log(`Output: ${OUTPUT} \u2713`);
