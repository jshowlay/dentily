import { inferUsStateFromAddresses } from "@/lib/parse-city-from-address";

/** Title-case a single word (handles hyphenated fragments). */
function titleCaseWord(word: string): string {
  const w = word.trim();
  if (!w) return "";
  return w
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
    .join("-");
}

function titleCasePhrase(phrase: string): string {
  return phrase
    .trim()
    .split(/\s+/)
    .map(titleCaseWord)
    .filter(Boolean)
    .join(" ");
}

function formatStateToken(statePart: string): string {
  const s = statePart.trim();
  if (!s) return "";
  if (s.length <= 3) return s.toUpperCase();
  return titleCasePhrase(s);
}

/**
 * Display label for a search market: "Miami, FL" (never raw "miami" / "boise, id").
 */
export function formatMarketLocation(location: string | null | undefined): string {
  const trimmed = (location ?? "").trim();
  if (!trimmed) return "";
  const comma = trimmed.indexOf(",");
  if (comma >= 0) {
    const city = titleCasePhrase(trimmed.slice(0, comma));
    const state = formatStateToken(trimmed.slice(comma + 1));
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
  }
  return titleCasePhrase(trimmed);
}

function locationHasUsState(location: string): boolean {
  const comma = location.indexOf(",");
  if (comma < 0) return false;
  const statePart = location.slice(comma + 1).trim();
  return /^[a-zA-Z]{2}(\b|\s)/.test(statePart) || /^[a-zA-Z]{2}$/.test(statePart);
}

/**
 * Search market label for UI — adds state from lead addresses when the saved search is city-only.
 */
export function formatMarketLocationForDisplay(
  location: string | null | undefined,
  leadAddresses?: Array<string | null | undefined>
): string {
  const trimmed = (location ?? "").trim();
  if (!trimmed) return "";
  if (locationHasUsState(trimmed)) {
    return formatMarketLocation(trimmed);
  }
  const inferred = inferUsStateFromAddresses(leadAddresses ?? []);
  if (inferred) {
    const city = formatMarketLocation(trimmed);
    return `${city}, ${inferred}`;
  }
  return formatMarketLocation(trimmed);
}

/** Filename segment: `Miami-FL` from "miami, fl". */
export function marketLocationFilenamePart(location: string | null | undefined): string {
  const formatted = formatMarketLocation(location);
  if (!formatted) return "Market";
  return formatted
    .replace(/,\s*/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 48);
}
