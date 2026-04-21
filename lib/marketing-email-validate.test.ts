import { describe, expect, it } from "vitest";
import { validateMarketingEmail } from "@/lib/marketing-email-validate";

describe("validateMarketingEmail", () => {
  it("accepts a normal business mailbox", () => {
    const r = validateMarketingEmail("FrontDesk@OakDental.co");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toBe("frontdesk@oakdental.co");
  });

  it("strips www. from the domain host and revalidates", () => {
    const r = validateMarketingEmail("info@www.trudentistryaustin.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toBe("info@trudentistryaustin.com");
  });

  it("strips a leading us… scraper prefix on long locals", () => {
    const r = validateMarketingEmail("uslosangelesemergencydentist@gmail.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toBe("losangelesemergencydentist@gmail.com");
  });

  it("rejects smooshed phone + domains (fixture)", () => {
    const r = validateMarketingEmail("818.312.9787etondental@gmail.cometondental.net21300");
    expect(r.ok).toBe(false);
  });

  it("rejects package-style version domains (fixture)", () => {
    expect(validateMarketingEmail("rspack@1.6.6").ok).toBe(false);
  });

  it("rejects zip + label glued into local part (fixture)", () => {
    const r = validateMarketingEmail("91436emailinfo@encinodentalstudio.comsocial");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(
        ["digit_letter_boundary_artifact", "phone_prefix_glued_to_local", "tld_artifact"].includes(r.reason)
      ).toBe(true);
    }
  });

  it("rejects vendor / bundler tokens in mailbox", () => {
    expect(validateMarketingEmail("noreply@sentry.io").ok).toBe(false);
    expect(validateMarketingEmail("hello@wixpress.com").ok).toBe(false);
  });

  it("rejects display-name parseaddr forms", () => {
    const r = validateMarketingEmail(`Sales Team <info@clinic.com>`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("parseaddr_display_name");
  });

  it("rejects numeric TLD labels", () => {
    expect(validateMarketingEmail("a@mail.123").ok).toBe(false);
  });

  it("rejects glued .com… TLD tails", () => {
    const r = validateMarketingEmail("x@encinodentalstudio.comsocial");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("tld_artifact");
  });
});
