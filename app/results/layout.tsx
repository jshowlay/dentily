import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search results",
  description:
    "Review scored dental practice leads for your market: priorities, rationale, and outreach starters before checkout.",
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
