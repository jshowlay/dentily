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

export async function searchBusinesses(query: string): Promise<NormalizedPlaceLead[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY.");
  }

  const fieldMask =
    "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.primaryType,places.googleMapsUri";

  const url = "https://places.googleapis.com/v1/places:searchText";
  const body = {
    textQuery: query.trim(),
    maxResultCount: 20,
  };

  const json = await googlePlacesFetchJson<unknown>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  const parsed = googlePlaceSearchResponseSchema.parse(json);
  const places = parsed.places ?? [];

  console.log(`[google-places] searchBusinesses resultCount=${places.length}`);

  return places.map((place) => toLead(place));
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

