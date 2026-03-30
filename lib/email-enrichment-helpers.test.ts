import { describe, expect, it, vi, afterEach } from "vitest";
import {
  collectLikelyContactPageUrls,
  decodeMailtoAddresses,
  detectContactFormPageUrl,
  mergePageEmails,
  normalizeWebsiteUrl,
  pickBestEmail,
} from "@/lib/email-enrichment-helpers";
import { enrichLeadWebsite } from "@/lib/email-enrichment";
import { loadEmailEnrichmentConfig } from "@/lib/email-enrichment-config";

describe("normalizeWebsiteUrl", () => {
  it("returns null for empty", () => {
    expect(normalizeWebsiteUrl(null)).toBeNull();
    expect(normalizeWebsiteUrl("")).toBeNull();
  });

  it("adds https and normalizes", () => {
    expect(normalizeWebsiteUrl("dental.com")).toBe("https://dental.com/");
  });
});

describe("decodeMailtoAddresses", () => {
  it("decodes single address", () => {
    expect(decodeMailtoAddresses("mailto:hello%40clinic.com")).toEqual(["hello@clinic.com"]);
  });

  it("splits multiple recipients", () => {
    expect(decodeMailtoAddresses("mailto:a@b.com,c@d.com")).toEqual(["a@b.com", "c@d.com"]);
  });
});

describe("mergePageEmails", () => {
  it("finds mailto on homepage", () => {
    const html = `<html><body><a href="mailto:info@smile.com">Email</a></body></html>`;
    const { orderedCandidates, contactFormUrl } = mergePageEmails(html, new URL("https://smile.com/"));
    expect(contactFormUrl).toBeNull();
    const { best } = pickBestEmail(orderedCandidates);
    expect(best?.email).toBe("info@smile.com");
    expect(best?.source).toBe("mailto");
  });

  it("finds visible email in body text", () => {
    const html = `<html><body><p>Call or email frontdesk@oakdental.co for appointments.</p></body></html>`;
    const { orderedCandidates } = mergePageEmails(html, new URL("https://oakdental.co/"));
    const { best } = pickBestEmail(orderedCandidates);
    expect(best?.email).toBe("frontdesk@oakdental.co");
    expect(best?.source).toBe("website");
  });

  it("finds email on synthetic contact page document", () => {
    const html = `<html><body><footer></footer><p>contact@contactpage.test</p></body></html>`;
    const { orderedCandidates } = mergePageEmails(html, new URL("https://example.com/contact"));
    const { best } = pickBestEmail(orderedCandidates);
    expect(best?.email).toBe("contact@contactpage.test");
    expect(best?.source).toBe("contact_page");
  });
});

describe("detectContactFormPageUrl", () => {
  it("returns page URL when substantive form present", () => {
    const html = `<html><body><form method="post"><input type="email" /><textarea></textarea></form></body></html>`;
    const u = new URL("https://clinic.com/contact");
    expect(detectContactFormPageUrl(html, u)).toBe(u.toString());
  });

  it("detects schedule link to internal URL", () => {
    const html = `<html><body><a href="/book">Schedule an appointment</a></body></html>`;
    const found = detectContactFormPageUrl(html, new URL("https://clinic.com/"));
    expect(found).toBe("https://clinic.com/book");
  });
});

describe("collectLikelyContactPageUrls", () => {
  it("resolves relative /contact link", () => {
    const html = `<html><body><a href="/contact-us">Reach us</a></body></html>`;
    const urls = collectLikelyContactPageUrls(html, new URL("https://practice.com/"), 5);
    expect(urls).toContain("https://practice.com/contact-us");
  });
});

describe("pickBestEmail", () => {
  it("prefers role inbox over personal free email", () => {
    const { best, alternates } = pickBestEmail([
      { email: "john.doe@gmail.com", source: "website" },
      { email: "info@familydental.test", source: "website" },
    ]);
    expect(best?.email).toBe("info@familydental.test");
    expect(alternates).toContain("john.doe@gmail.com");
  });

  it("rejects placeholder addresses", () => {
    const { best } = pickBestEmail([{ email: "test@test.com", source: "website" }]);
    expect(best).toBeNull();
  });

  it("discards malformed addresses", () => {
    const { best } = pickBestEmail([{ email: "not@valid", source: "website" }]);
    expect(best).toBeNull();
  });
});

describe("enrichLeadWebsite (fetch mocked)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks skipped when website missing", async () => {
    const cfg = loadEmailEnrichmentConfig();
    const r = await enrichLeadWebsite({ name: "X", website: null, placeId: "1" }, cfg);
    expect(r.emailStatus).toBe("skipped");
    expect(r.enrichmentNotes).toContain("No website");
  });

  it("returns found when homepage has mailto", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          url: "https://demo.test/",
          headers: { get: () => "text/html; charset=utf-8" },
          text: async () =>
            `<html><body><a href="mailto:hello@demo.test">Hi</a></body></html>`,
        })
      )
    );
    const cfg = { ...loadEmailEnrichmentConfig(), retryCount: 0, maxInternalPages: 0 };
    const r = await enrichLeadWebsite(
      { name: "Demo", website: "https://demo.test", placeId: "p1" },
      cfg
    );
    expect(r.emailStatus).toBe("found");
    expect(r.primaryEmail).toBe("hello@demo.test");
    expect(r.emailSource).toBe("mailto");
  });

  it("follows contact page for email when home has link only", async () => {
    const home = `<html><body><a href="/contact">Contact</a></body></html>`;
    const contact = `<html><body><p>info@deep.test</p></body></html>`;
    vi.stubGlobal("fetch", (url: string) => {
      if (url.includes("/contact")) {
        return Promise.resolve({
          ok: true,
          url: "https://deep.test/contact",
          headers: { get: () => "text/html" },
          text: async () => contact,
        });
      }
      return Promise.resolve({
        ok: true,
        url: "https://deep.test/",
        headers: { get: () => "text/html" },
        text: async () => home,
      });
    });
    const cfg = { ...loadEmailEnrichmentConfig(), retryCount: 0, maxInternalPages: 3 };
    const r = await enrichLeadWebsite(
      { name: "Deep", website: "https://deep.test", placeId: "p2" },
      cfg
    );
    expect(r.emailStatus).toBe("found");
    expect(r.primaryEmail).toBe("info@deep.test");
  });

  it("returns contact_form_only when form but no email", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          url: "https://forms.test/",
          headers: { get: () => "text/html" },
          text: async () =>
            `<html><body><form method="post" action="/submit"><input type="text" /><textarea></textarea></form></body></html>`,
        })
      )
    );
    const cfg = { ...loadEmailEnrichmentConfig(), retryCount: 0, maxInternalPages: 0 };
    const r = await enrichLeadWebsite(
      { name: "Forms", website: "https://forms.test", placeId: "p3" },
      cfg
    );
    expect(r.emailStatus).toBe("contact_form_only");
    expect(r.primaryEmail).toBeNull();
    expect(r.contactFormUrl).toBeTruthy();
  });

  it("returns invalid when mailto has malformed address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          url: "https://bad.test/",
          headers: { get: () => "text/html" },
          text: async () => `<html><body><a href="mailto:a@b">Bad</a></body></html>`,
        })
      )
    );
    const cfg = { ...loadEmailEnrichmentConfig(), retryCount: 0, maxInternalPages: 0 };
    const r = await enrichLeadWebsite(
      { name: "Bad", website: "https://bad.test", placeId: "p4" },
      cfg
    );
    expect(r.emailStatus).toBe("invalid");
  });
});
