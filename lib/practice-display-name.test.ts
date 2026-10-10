import { describe, expect, it } from "vitest";
import { cleanPracticeDisplayName } from "@/lib/practice-display-name";

describe("cleanPracticeDisplayName", () => {
  it("splits glued entity suffixes on listing titles", () => {
    expect(cleanPracticeDisplayName("Lopez Dental CenterInc")).toBe("Lopez Dental Center");
    expect(cleanPracticeDisplayName("Foo Dental GroupLLC")).toBe("Foo Dental Group");
  });

  it("strips spaced trailing entity suffixes", () => {
    expect(cleanPracticeDisplayName("Forest Family Dental PLLC")).toBe("Forest Family Dental");
    expect(cleanPracticeDisplayName("Acme Smile Inc")).toBe("Acme Smile");
    expect(cleanPracticeDisplayName("Smith & Jones DDS PC")).toBe("Smith & Jones");
  });

  it("leaves normal names unchanged", () => {
    expect(cleanPracticeDisplayName("Forest Family Dental")).toBe("Forest Family Dental");
  });
});
