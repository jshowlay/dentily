import { describe, expect, it } from "vitest";
import {
  googleMapsUrlHasCid,
  normalizeMapsUrlForCsv,
  stripAllQueryParams,
} from "@/lib/url-normalize";

describe("normalizeMapsUrlForCsv", () => {
  it("keeps cid and drops g_mp", () => {
    const raw =
      "https://maps.google.com/?cid=11611754677541690579&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA";
    const out = normalizeMapsUrlForCsv(raw);
    expect(out).toContain("cid=11611754677541690579");
    expect(out).not.toContain("g_mp");
    expect(googleMapsUrlHasCid(out)).toBe(true);
  });

  it("stripAllQueryParams removes all params from website URLs", () => {
    expect(stripAllQueryParams("https://clinic.com/?utm_source=gbp&foo=1")).toBe(
      "https://clinic.com/"
    );
  });
});
