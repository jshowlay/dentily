import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dentily — High-intent dental patient growth",
  description:
    "Dentily helps dental practices prioritize local opportunities for implants, cosmetic dentistry, and Invisalign — scored listings, clear tiers, and outreach in one simple pack.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
