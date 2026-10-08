import { describe, expect, it } from "vitest";
import { isOneTimePackCheckoutSession } from "@/lib/stripe-pack-delivery";

describe("stripe checkout webhook helpers", () => {
  it("detects one-time pack vs subscription checkout", () => {
    expect(
      isOneTimePackCheckoutSession({
        metadata: { searchId: "42" },
      } as import("stripe").Stripe.Checkout.Session)
    ).toBe(true);
    expect(
      isOneTimePackCheckoutSession({
        metadata: { userId: "1", plan: "starter" },
      } as import("stripe").Stripe.Checkout.Session)
    ).toBe(false);
  });
});
