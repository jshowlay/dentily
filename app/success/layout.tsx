import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment complete",
  description: "Your Dentily checkout finished. Download your lead pack CSV or return to your search results.",
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
