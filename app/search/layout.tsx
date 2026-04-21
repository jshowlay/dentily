import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search your market",
  description:
    "Pick a city or area to surface scored dental practices, contact paths, and outreach drafts for B2B prospecting.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
