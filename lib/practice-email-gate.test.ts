import { describe, expect, it } from "vitest";
import {
  emailMailboxMatchesPracticeIdentity,
  isFreeMailDomain,
} from "@/lib/practice-email-gate";
import { rejectOffDomainOrganizationEmail } from "@/lib/lead-pack-export";
import { makeFixtureExportRow } from "@/lib/lead-pipeline-fixtures";

describe("practice email gate", () => {
  it("recognizes common free-mail domains", () => {
    expect(isFreeMailDomain("gmail.com")).toBe(true);
    expect(isFreeMailDomain("outlook.com")).toBe(true);
    expect(isFreeMailDomain("weomedia.com")).toBe(false);
  });

  it("keeps free-mail when local part matches practice name", () => {
    expect(
      emailMailboxMatchesPracticeIdentity("brookdaledental@gmail.com", "Brookdale Dental")
    ).toBe(true);
    expect(
      emailMailboxMatchesPracticeIdentity("randomuser@gmail.com", "Brookdale Dental")
    ).toBe(false);
  });

  it("rejects legacy ISP mail unless local part matches the practice", () => {
    expect(
      emailMailboxMatchesPracticeIdentity(
        "topgum@mindspring.com",
        "Periodontal Health Specialists of Idaho"
      )
    ).toBe(false);
    expect(
      emailMailboxMatchesPracticeIdentity("periodontalidaho@mindspring.com", "Periodontal Health Specialists of Idaho")
    ).toBe(true);
  });

  it("export gate keeps matching gmail and rejects unrelated org domain", () => {
    const kept = rejectOffDomainOrganizationEmail(
      makeFixtureExportRow({
        name: "Brookdale Dental",
        address: "1 Main, Boise, ID",
        website: "https://www.brookdaledental.com/",
        primary_email: "brookdaledental@gmail.com",
      })
    );
    expect(kept.primary_email).toBe("brookdaledental@gmail.com");

    const rejected = rejectOffDomainOrganizationEmail(
      makeFixtureExportRow({
        name: "Boise Endodontics",
        address: "2 Main, Boise, ID",
        website: "https://boiseendo.com/",
        primary_email: "info@weomedia.com",
      })
    );
    expect(rejected.primary_email).toBeNull();
  });
});
