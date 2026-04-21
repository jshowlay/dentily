import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Dentily Practice Opportunity Pack",
  description:
    "Get 50 scored dental practice leads for $49 one-time, or $39/mo for fresh leads every month. Instant CSV download. Built for agencies and freelancers.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
