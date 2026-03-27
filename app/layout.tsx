import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dentily — More dental patients, prioritized outreach",
  description:
    "Dentily finds high-opportunity dental practices in your area and gives you prioritized outreach to grow patients — one simple lead pack.",
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
