import { describe, expect, it } from "vitest";
import { buildSearchSubmitProgressSteps, cityLabelFromLocation } from "@/lib/search-submit-progress";

describe("search submit progress", () => {
  it("builds four steps with the market city", () => {
    const steps = buildSearchSubmitProgressSteps("Austin, TX");
    expect(steps).toHaveLength(4);
    expect(steps[0]).toContain("Austin");
    expect(steps[1]).toMatch(/Comparing ratings/);
  });

  it("falls back when location is empty", () => {
    expect(cityLabelFromLocation("")).toBe("your market");
    expect(buildSearchSubmitProgressSteps("")[0]).toContain("your market");
  });
});
