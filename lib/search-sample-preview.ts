import { SITE } from "@/lib/site-config";

/** Static sample rows for the /search results preview panel (not live API data). */

export type SearchPreviewRow = {
  name: string;
  city: string;
  score: number;
  priority: "High" | "Medium";
  opportunitySignal: string;
  contact: string;
};

export const SEARCH_PREVIEW_VISIBLE_ROWS: SearchPreviewRow[] = [
  {
    name: "Dentists at Midtown",
    city: "Miami, FL",
    score: 76,
    priority: "High",
    opportunitySignal: "Public rating under 4.5 — reputation gap vs. nearby competitors",
    contact: "Contact Form",
  },
  {
    name: "Ultra Smile DentaSpa",
    city: "Miami, FL",
    score: 58,
    priority: "High",
    opportunitySignal: "Strong profile with no visible growth motion",
    contact: "Email",
  },
  {
    name: "My Dentist in Miami",
    city: "Miami, FL",
    score: 64,
    priority: "High",
    opportunitySignal: "Low review count — visibility and reputation-building unlock",
    contact: "Email",
  },
];

export const SEARCH_PREVIEW_LOCKED_ROWS: SearchPreviewRow[] = [
  {
    name: "Brickell Dental Arts",
    city: "Miami, FL",
    score: 71,
    priority: "High",
    opportunitySignal: "Rating gap vs. top competitors in the same ZIP",
    contact: "Email",
  },
  {
    name: "Coconut Grove Family Dental",
    city: "Miami, FL",
    score: 62,
    priority: "Medium",
    opportunitySignal: "Thin digital path — phone-only contact on file",
    contact: "Phone",
  },
  {
    name: "Wynwood Dental Studio",
    city: "Miami, FL",
    score: 55,
    priority: "Medium",
    opportunitySignal: "Established static — ready for paid acquisition",
    contact: "Contact Form",
  },
];

export const SEARCH_PREVIEW_STATS = {
  total: 150,
  highPriority: 93,
  opportunityTypes: 3,
  price: "$99",
} as const;

export const WHATS_INCLUDED = [
  `Up to ${SITE.leadPackCount} scored practice records`,
  "Priority tier + numeric score per lead",
  "Best contact path (email, form, or phone)",
  "Estimated monthly opportunity range",
  "Ready-to-send outreach draft per lead",
  "CSV download · same-day access",
] as const;
