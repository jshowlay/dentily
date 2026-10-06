import { describe, expect, it } from "vitest";
import { parseMarketCityState } from "@/lib/posthog-events";

describe("parseMarketCityState", () => {
  it("splits city and state from a typical market string", () => {
    expect(parseMarketCityState("Austin, TX")).toEqual({ city: "Austin", state: "TX" });
  });

  it("handles state before zip", () => {
    expect(parseMarketCityState("Phoenix, AZ 85001")).toEqual({ city: "Phoenix", state: "AZ" });
  });
});
