import { z } from "zod";
import { Lead } from "@/lib/types";

const googlePlaceSearchResponseSchema = z.object({
  places: z.array(
    z.object({
      id: z.string(),
      displayName: z
        .object({
          text: z.string(),
        })
        .optional(),
      formattedAddress: z.string().optional().nullable(),
      websiteUri: z.string().optional().nullable(),
      nationalPhoneNumber: z.string().optional().nullable(),
      rating: z.number().optional().nullable(),
      userRatingCount: z.number().optional().nullable(),
      primaryType: z.string().optional().nullable(),
      googleMapsUri: z.string().optional().nullable(),
      addressComponents: z
        .array(
          z.object({
            longText: z.string().optional().nullable(),
            shortText: z.string().optional().nullable(),
            types: z.array(z.string()).optional().nullable(),
          })
        )
        .optional()
        .nullable(),
    })
  ).optional(),
  nextPageToken: z.string().optional().nullable(),
});

type GooglePlace = NonNullable<
  z.infer<typeof googlePlaceSearchResponseSchema>["places"]
>[number];

const googlePlaceDetailsResponseSchema = googlePlaceSearchResponseSchema;

export type NormalizedPlaceLead = Pick<
  Lead,
  | "placeId"
  | "name"
  | "address"
  | "website"
  | "phone"
  | "rating"
  | "reviewCount"
  | "primaryType"
  | "mapsUrl"
  | "metadata"
>;

/** Google allows up to 3 pages (≈60 places) per text search query. */
const MAX_PAGES_PER_QUERY = 3;
/** Max unique places returned from Places before quality/geo filtering downstream. */
export const MAX_RAW_RESULTS = 200;
const PAGE_SIZE = 20;
/** nextPageToken is invalid until this delay elapses (Places API requirement). */
const PAGE_TOKEN_DELAY_MS = 2000;

const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";
const SEARCH_TEXT_FIELD_MASK =
  "nextPageToken,places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.primaryType,places.googleMapsUri,places.addressComponents";

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeForDedup(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function dedupeLeads(leads: NormalizedPlaceLead[], targetCount: number): NormalizedPlaceLead[] {
  const out: NormalizedPlaceLead[] = [];
  const seenPlaceIds = new Set<string>();
  const seenNamePhone = new Set<string>();

  for (const lead of leads) {
    const placeId = normalizeForDedup(lead.placeId);
    const name = normalizeForDedup(lead.name);
    const phone = normalizeForDedup(lead.phone);

    if (!placeId || !name) continue;
    if (seenPlaceIds.has(placeId)) continue;

    const namePhoneKey = `${name}::${phone}`;
    if (phone && seenNamePhone.has(namePhoneKey)) continue;

    seenPlaceIds.add(placeId);
    if (phone) seenNamePhone.add(namePhoneKey);
    out.push(lead);

    if (out.length >= targetCount) break;
  }

  return out;
}

function toLead(place: unknown): NormalizedPlaceLead {
  const parsed = googlePlaceDetailsResponseSchema.safeParse({ places: [place] });
  const first = parsed.success ? parsed.data.places?.[0] : null;

  if (!first) {
    throw new Error("Could not normalize Google Places result.");
  }

  return {
    placeId: cleanString(first.id) ?? "",
    name: cleanString(first.displayName?.text) ?? "",
    address: cleanString(first.formattedAddress),
    website: cleanString(first.websiteUri),
    phone: cleanString(first.nationalPhoneNumber),
    rating: cleanNumber(first.rating),
    reviewCount: cleanNumber(first.userRatingCount),
    primaryType: cleanString(first.primaryType),
    mapsUrl: cleanString(first.googleMapsUri),
    metadata: {
      provider: "google_places",
      raw: place,
    },
  };
}

/** Transient network blips (TLS resets, timeouts, DNS hiccups) are worth retrying. */
function isRetryableFetchError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  const code = String(cause?.code ?? "").toUpperCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("network") ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "UND_ERR_SOCKET"
  );
}

const FETCH_MAX_ATTEMPTS = 3;
const FETCH_RETRY_BASE_MS = 400;

async function googlePlacesFetchJson<T>(url: string, init: RequestInit): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // Retry on rate-limit / transient server errors; fail fast otherwise.
        if ((res.status === 429 || res.status >= 500) && attempt < FETCH_MAX_ATTEMPTS) {
          lastError = new Error(`Google Places request failed: ${res.status} ${res.statusText}. ${text}`);
          await new Promise((r) => setTimeout(r, FETCH_RETRY_BASE_MS * attempt));
          continue;
        }
        throw new Error(`Google Places request failed: ${res.status} ${res.statusText}. ${text}`);
      }
      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_MAX_ATTEMPTS && isRetryableFetchError(error)) {
        console.warn(
          `[google-places] fetch attempt ${attempt}/${FETCH_MAX_ATTEMPTS} failed, retrying`,
          error instanceof Error ? error.message : String(error)
        );
        await new Promise((r) => setTimeout(r, FETCH_RETRY_BASE_MS * attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Google Places request failed.");
}

function extractLocationFromQuery(query: string): string | null {
  const idx = query.toLowerCase().lastIndexOf(" in ");
  if (idx === -1) return null;
  const location = query.slice(idx + 4).trim();
  return location.length > 0 ? location : null;
}

function isDentalRelatedQuery(query: string): boolean {
  return /dent|dental|orthodont|oral/i.test(query);
}

const DENTAL_SEARCH_TERMS = [
  "dentist",
  "dental office",
  "dental clinic",
  "orthodontist",
  "oral surgeon",
];

function buildDentalSearchQueries(location: string, primaryQuery: string): string[] {
  const loc = location.trim();
  const variants = [primaryQuery, ...DENTAL_SEARCH_TERMS.map((term) => `${term} in ${loc}`)];
  return Array.from(new Set(variants.map((q) => q.trim()).filter(Boolean)));
}

function dedupePlacesById(places: GooglePlace[]): GooglePlace[] {
  const seen = new Set<string>();
  const out: GooglePlace[] = [];
  for (const place of places) {
    const id = place.id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(place);
  }
  return out;
}

/** Full US state names → USPS abbreviations (for geo-validation fallback). */
const US_STATE_ABBR: Record<string, string> = {
  alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
  colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
  hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia",
  kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md",
  massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms",
  missouri: "mo", montana: "mt", nebraska: "ne", nevada: "nv",
  "new hampshire": "nh", "new jersey": "nj", "new mexico": "nm", "new york": "ny",
  "north carolina": "nc", "north dakota": "nd", ohio: "oh", oklahoma: "ok",
  oregon: "or", pennsylvania: "pa", "rhode island": "ri", "south carolina": "sc",
  "south dakota": "sd", tennessee: "tn", texas: "tx", utah: "ut", vermont: "vt",
  virginia: "va", washington: "wa", "west virginia": "wv", wisconsin: "wi",
  wyoming: "wy", "district of columbia": "dc",
};

export function parseCityState(input: string): { city: string; state: string } {
  const parts = input.split(",").map((s) => s.trim());
  return {
    city: parts[0] || input.trim(),
    state: parts[1] || "",
  };
}

/** Normalize a state token to its 2-letter form when recognizable. */
function normalizeState(state: string): { full: string; abbr: string } {
  const s = state.toLowerCase().trim();
  if (!s) return { full: "", abbr: "" };
  if (s.length === 2) {
    const full = Object.keys(US_STATE_ABBR).find((k) => US_STATE_ABBR[k] === s) ?? "";
    return { full, abbr: s };
  }
  return { full: s, abbr: US_STATE_ABBR[s] ?? s.slice(0, 2) };
}

const CITY_COMPONENT_TYPES = [
  "locality",
  "postal_town",
  "sublocality",
  "sublocality_level_1",
  "administrative_area_level_3",
  "administrative_area_level_2",
  "neighborhood",
];

/** Extract a place's 2-letter state from addressComponents, else formatted address. */
function placeStateAbbr(place: GooglePlace): string | null {
  const components = place.addressComponents ?? [];
  for (const c of components) {
    if ((c.types ?? []).includes("administrative_area_level_1")) {
      const short = (c.shortText ?? "").toLowerCase();
      if (short.length === 2) return short;
      const long = (c.longText ?? "").toLowerCase();
      if (US_STATE_ABBR[long]) return US_STATE_ABBR[long];
    }
  }
  // Fallback: ", TX " or ", TX," in the formatted address.
  const m = (place.formattedAddress ?? "").toLowerCase().match(/,\s*([a-z]{2})(?:\s+\d{5}|,|\s|$)/);
  return m?.[1] ?? null;
}

/**
 * Validate a Places (New) result belongs to the intended city AND state together.
 *
 * State is required and matched strictly (fixes same-named cities in other states,
 * e.g. Dallas GA/OR vs Dallas TX). The formatted-address fallback requires the
 * "city, state" pair to appear as a contiguous unit so a stray state token elsewhere
 * in the string (suite numbers, tracking URLs) cannot satisfy the check.
 */
export function isInTargetCity(place: GooglePlace, targetCity: string, targetState: string): boolean {
  const city = targetCity.toLowerCase().trim();
  const { full: stateFull, abbr: stateAbbr } = normalizeState(targetState);
  if (!stateFull && !stateAbbr) return false;

  const components = place.addressComponents ?? [];
  const formatted = (place.formattedAddress ?? "").toLowerCase();

  // --- Primary: address_components (most reliable) — require city AND state ---
  if (components.length > 0) {
    const stateMatch = components.some((c) => {
      if (!(c.types ?? []).includes("administrative_area_level_1")) return false;
      const long = (c.longText ?? "").toLowerCase();
      const short = (c.shortText ?? "").toLowerCase();
      return (
        (stateFull && long === stateFull) ||
        (stateAbbr && (short === stateAbbr || long === stateAbbr))
      );
    });
    if (!stateMatch) return false;
    if (!city) return true;

    const cityMatch = components.some((c) => {
      if (!(c.types ?? []).some((t) => CITY_COMPONENT_TYPES.includes(t))) return false;
      return (c.longText ?? "").toLowerCase() === city;
    });
    // Some listings label the city only in the formatted address (no locality component);
    // accept the contiguous "city, state" pair there as a backstop.
    if (cityMatch) return true;
    return (
      formatted.includes(`${city}, ${stateAbbr}`) ||
      (Boolean(stateFull) && formatted.includes(`${city}, ${stateFull}`))
    );
  }

  // --- Fallback: formatted address. Require "city, state" as a contiguous unit ---
  if (!city) {
    return Boolean(
      (stateAbbr && (formatted.includes(`, ${stateAbbr} `) || formatted.includes(`, ${stateAbbr},`))) ||
        (stateFull && formatted.includes(`, ${stateFull}`))
    );
  }
  return (
    formatted.includes(`${city}, ${stateAbbr}`) ||
    (Boolean(stateFull) && formatted.includes(`${city}, ${stateFull}`))
  );
}

/**
 * When the user omits a state (single free-text field), infer the intended state
 * from the plurality of results — Google ranks the prominent same-named city first,
 * so e.g. a bare "Dallas" resolves to TX and GA/OR listings are dropped.
 */
function inferDominantState(places: GooglePlace[], city: string): string | null {
  const counts = new Map<string, number>();
  for (const p of places) {
    // Only count places whose city matches, so the tally reflects the searched city.
    const formatted = (p.formattedAddress ?? "").toLowerCase();
    const localityMatch = (p.addressComponents ?? []).some(
      (c) =>
        (c.types ?? []).some((t) => CITY_COMPONENT_TYPES.includes(t)) &&
        (c.longText ?? "").toLowerCase() === city
    );
    if (city && !localityMatch && !formatted.includes(`${city},`)) continue;
    const st = placeStateAbbr(p);
    if (!st) continue;
    counts.set(st, (counts.get(st) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [st, n] of Array.from(counts.entries())) {
    if (n > bestN) {
      best = st;
      bestN = n;
    }
  }
  return best;
}

function geoFilterPlaces(places: GooglePlace[], location: string): GooglePlace[] {
  const { city } = parseCityState(location);
  let { state } = parseCityState(location);

  if (!state.trim()) {
    const inferred = inferDominantState(places, city.toLowerCase().trim());
    if (!inferred) {
      console.log(`[google-places] geoFilter skipped (no state in "${location}", none inferable)`);
      return places;
    }
    state = inferred;
    console.log(`[google-places] geoFilter inferred state="${state}" for "${location}"`);
  }

  const kept = places.filter((p) => isInTargetCity(p, city, state));
  console.log(
    `[google-places] geoFilter city=${JSON.stringify(city)} state=${JSON.stringify(
      state
    )} before=${places.length} after=${kept.length}`
  );
  return kept;
}

/** Paginate one text query up to MAX_PAGES_PER_QUERY (≈60 raw places). */
async function searchTextQueryAllPages(
  textQuery: string,
  apiKey: string,
  queryLabel: string
): Promise<GooglePlace[]> {
  const allPlaces: GooglePlace[] = [];
  let nextPageToken: string | null = null;

  for (let page = 1; page <= MAX_PAGES_PER_QUERY; page += 1) {
    if (page > 1) {
      await new Promise((resolve) => setTimeout(resolve, PAGE_TOKEN_DELAY_MS));
    }

    const requestBody: {
      textQuery: string;
      pageSize: number;
      pageToken?: string;
    } = {
      textQuery,
      pageSize: PAGE_SIZE,
    };

    if (page > 1 && nextPageToken) {
      requestBody.pageToken = nextPageToken;
    }

    let parsed: z.infer<typeof googlePlaceSearchResponseSchema>;
    try {
      const json = await googlePlacesFetchJson<unknown>(SEARCH_TEXT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": SEARCH_TEXT_FIELD_MASK,
        },
        body: JSON.stringify(requestBody),
      });
      parsed = googlePlaceSearchResponseSchema.parse(json);
    } catch (error) {
      if (page === 1) {
        throw error;
      }
      console.warn(
        `[google-places] "${queryLabel}" page ${page} failed, keeping earlier pages`,
        error instanceof Error ? error.message : String(error)
      );
      break;
    }

    const pagePlaces = parsed.places ?? [];
    allPlaces.push(...pagePlaces);
    console.log(
      `[google-places] "${queryLabel}" page${page} resultCount=${pagePlaces.length} hasNextPageToken=${Boolean(
        parsed.nextPageToken
      )}`
    );

    nextPageToken = parsed.nextPageToken ?? null;
    if (!nextPageToken) {
      break;
    }
  }

  return allPlaces;
}

export async function searchBusinesses(
  query: string,
  targetCount = MAX_RAW_RESULTS
): Promise<NormalizedPlaceLead[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY.");
  }

  const normalizedQuery = query.trim();
  const cappedTarget = Math.max(1, Math.min(targetCount, MAX_RAW_RESULTS));

  const location = extractLocationFromQuery(normalizedQuery) ?? normalizedQuery;
  const useMultiQuery = isDentalRelatedQuery(normalizedQuery);
  const textQueries = useMultiQuery
    ? buildDentalSearchQueries(location, normalizedQuery)
    : [normalizedQuery];

  console.log(
    `[google-places] multiQuery=${useMultiQuery} queryCount=${textQueries.length} target=${cappedTarget}`
  );

  // allSettled so a single query's transient failure can't sink the whole search.
  const settled = await Promise.allSettled(
    textQueries.map((textQuery) => searchTextQueryAllPages(textQuery, apiKey, textQuery))
  );

  const perQueryResults: GooglePlace[][] = [];
  let failedQueries = 0;
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      perQueryResults.push(result.value);
    } else {
      failedQueries += 1;
      console.warn(
        `[google-places] query "${textQueries[i]}" failed`,
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      );
    }
  });

  // Only hard-fail if every query failed (likely a bad key, quota, or full outage).
  if (perQueryResults.length === 0) {
    const firstReason = settled.find((s) => s.status === "rejected") as
      | PromiseRejectedResult
      | undefined;
    throw firstReason?.reason instanceof Error
      ? firstReason.reason
      : new Error("All Google Places queries failed.");
  }

  const allPlaces = dedupePlacesById(perQueryResults.flat());
  console.log(
    `[google-places] totalRawResults=${allPlaces.length} failedQueries=${failedQueries}/${textQueries.length}`
  );

  const geoFiltered = geoFilterPlaces(allPlaces, location);

  const normalized = geoFiltered
    .map((place) => {
      try {
        return toLead(place);
      } catch (error) {
        console.warn(
          "[google-places] normalize skipped place",
          error instanceof Error ? error.message : String(error)
        );
        return null;
      }
    })
    .filter((lead): lead is NormalizedPlaceLead => Boolean(lead));

  console.log(`[google-places] totalNormalizedResults=${normalized.length}`);

  const deduped = dedupeLeads(normalized, cappedTarget);
  console.log(`[google-places] totalDedupedResults=${deduped.length}`);
  console.log(`[google-places] finalReturned=${deduped.length}`);

  return deduped;
}

export async function getPlaceDetails(placeId: string): Promise<NormalizedPlaceLead> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY.");
  }

  const fieldMask =
    "id,displayName,formattedAddress,websiteUri,nationalPhoneNumber,rating,userRatingCount,primaryType,googleMapsUri";

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

  const json = await googlePlacesFetchJson<unknown>(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
  });

  // The schema expects `{ places: [...] }`; adapt.
  const parsed = googlePlaceDetailsResponseSchema.parse({ places: [json] });
  const place = parsed.places?.[0];
  if (!place) {
    throw new Error("Google Places details returned no place.");
  }

  return toLead(place);
}

