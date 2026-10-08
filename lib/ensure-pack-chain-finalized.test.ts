import { describe, expect, it } from "vitest";
import { isPackChainProbeFinalized } from "@/lib/ensure-pack-chain-finalized";
import { SEARCH_PACK_CHAIN_FINALIZED_AT_KEY } from "@/lib/pack-listing-quality";

describe("ensure pack chain finalized", () => {
  it("detects finalized searches from metadata", () => {
    expect(isPackChainProbeFinalized({})).toBe(false);
    expect(
      isPackChainProbeFinalized({ [SEARCH_PACK_CHAIN_FINALIZED_AT_KEY]: "2026-01-01T00:00:00.000Z" })
    ).toBe(true);
  });
});
