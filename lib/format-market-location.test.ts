import { describe, expect, it } from "vitest";
import { formatMarketLocation, marketLocationFilenamePart } from "@/lib/format-market-location";

describe("formatMarketLocation", () => {
  it("formats city and state with proper capitalization", () => {
    expect(formatMarketLocation("miami, fl")).toBe("Miami, FL");
    expect(formatMarketLocation("Boise, ID")).toBe("Boise, ID");
    expect(formatMarketLocation("san antonio, tx")).toBe("San Antonio, TX");
  });

  it("builds filename parts", () => {
    expect(marketLocationFilenamePart("miami, fl")).toBe("Miami-FL");
  });
});
