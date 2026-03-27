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
    })
  ).optional(),
  nextPageToken: z.string().optional().nullable(),
});

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

const MAX_PAGES = 3;
const DEFAULT_TARGET_COUNT = 50;
const PAGE_SIZE = 20;

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

async function googlePlacesFetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Places request failed: ${res.status} ${res.statusText}. ${text}`);
  }
  return (await res.json()) as T;
}

export async function searchBusinesses(
  query: string,
  targetCount = DEFAULT_TARGET_COUNT
): Promise<NormalizedPlaceLead[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY.");
  }

  const fieldMask =
    "nextPageToken,places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.primaryType,places.googleMapsUri";

  const url = "https://places.googleapis.com/v1/places:searchText";
  const normalizedQuery = query.trim();
  const cappedTarget = Math.max(1, Math.min(targetCount, DEFAULT_TARGET_COUNT));

  const allPlaces: unknown[] = [];
  let nextPageToken: string | null = null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const requestBody: {
      textQuery: string;
      pageSize: number;
      pageToken?: string;
    } = {
      textQuery: normalizedQuery,
      pageSize: PAGE_SIZE,
    };

    if (page > 1 && nextPageToken) {
      requestBody.pageToken = nextPageToken;
    }

    let parsed: z.infer<typeof googlePlaceSearchResponseSchema>;
    try {
      const json = await googlePlacesFetchJson<unknown>(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(requestBody),
      });
      parsed = googlePlaceSearchResponseSchema.parse(json);
    } catch (error) {
      if (page === 1) {
        throw error;
      }
      console.warn(
        `[google-places] page ${page} failed, keeping earlier pages`,
        error instanceof Error ? error.message : String(error)
      );
      break;
    }

    const pagePlaces = parsed.places ?? [];
    allPlaces.push(...pagePlaces);
    console.log(
      `[google-places] page${page} resultCount=${pagePlaces.length} hasNextPageToken=${Boolean(
        parsed.nextPageToken
      )}`
    );

    nextPageToken = parsed.nextPageToken ?? null;
    if (!nextPageToken || allPlaces.length >= cappedTarget) {
      break;
    }
  }

  console.log(`[google-places] totalRawResults=${allPlaces.length}`);

  const normalized = allPlaces
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

