import { describe, expect, it } from "vitest";
import { buildPackExportHref, hasPackExportAuthQuery } from "@/lib/pack-export-url";

describe("pack export URL helpers", () => {
  it("builds href with session_id and token", () => {
    const href = buildPackExportHref(42, { sessionId: "cs_test", token: "abc" });
    expect(href).toBe("/api/search/42/export?session_id=cs_test&token=abc");
  });

  it("requires at least one auth query param", () => {
    expect(hasPackExportAuthQuery({ sessionId: "cs_x" })).toBe(true);
    expect(hasPackExportAuthQuery({ token: "t" })).toBe(true);
    expect(hasPackExportAuthQuery({})).toBe(false);
  });
});
