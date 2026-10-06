import { describe, expect, it } from "vitest";
import { googleListingUrlHasDsoTrackingSignals } from "@/lib/dso-listing-url";
import { classifyPracticeOwnership } from "@/lib/practice-ownership";

describe("googleListingUrlHasDsoTrackingSignals", () => {
  it("flags Austin Modern GBP tracking URL", () => {
    const url =
      "https://www.austinmoderndentistry.com/?sc_cid=GBP%3AO%3AGP%3A771%3AOrganic_Search%3AGeneral%3Ana&_vsrefdom=organic_gbp&y_source=1_MTEwMjk0Ni03MTUtbG9jYXRpb24ud2Vic2l0ZQ%3D%3D";
    expect(googleListingUrlHasDsoTrackingSignals(url)).toBe(true);
    expect(
      classifyPracticeOwnership({
        name: "Austin Modern Dentistry and Orthodontics",
        website: "https://www.austinmoderndentistry.com/",
        googleListingWebsite: url,
      })
    ).toBe("Likely DSO");
  });

  it("does not flag clean practice URLs", () => {
    expect(googleListingUrlHasDsoTrackingSignals("https://breezeoralcare.com/")).toBe(false);
  });
});
