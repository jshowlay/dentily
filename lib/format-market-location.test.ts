import { describe, expect, it } from "vitest";
import {
  formatMarketLocation,
  formatMarketLocationForDisplay,
  marketLocationFilenamePart,
} from "@/lib/format-market-location";

describe("formatMarketLocation", () => {
  it("formats city and state with proper capitalization", () => {
    expect(formatMarketLocation("miami, fl")).toBe("Miami, FL");
    expect(formatMarketLocation("Boise, ID")).toBe("Boise, ID");
    expect(formatMarketLocation("san antonio, tx")).toBe("San Antonio, TX");
  });

  it("infers state from lead addresses when search is city-only", () => {
    expect(
      formatMarketLocationForDisplay("miami", [
        "100 SW 1st Ave, Miami, FL 33130",
        "200 Brickell Ave, Miami, FL 33131",
      ])
    ).toBe("Miami, FL");
  });

  it("builds filename parts", () => {
    expect(marketLocationFilenamePart("miami, fl")).toBe("Miami-FL");
  });
});
