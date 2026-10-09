import { describe, expect, it } from "vitest";
import { cleanPracticeDisplayName } from "@/lib/practice-display-name";

describe("cleanPracticeDisplayName", () => {
  it("splits glued entity suffixes on listing titles", () => {
    expect(cleanPracticeDisplayName("Lopez Dental CenterInc")).toBe("Lopez Dental Center");
    expect(cleanPracticeDisplayName("Foo Dental GroupLLC")).toBe("Foo Dental Group");
  });

  it("leaves normal names unchanged", () => {
    expect(cleanPracticeDisplayName("Forest Family Dental")).toBe("Forest Family Dental");
  });
});
