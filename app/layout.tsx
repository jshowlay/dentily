import "./globals.css";
import type { Metadata, Viewport } from "next";
import { PostHogAnalyticsProvider } from "@/components/posthog-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { getMetadataBaseUrl } from "@/lib/metadata-base-url";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: "Dentily — Scored dental practice opportunities",
  description:
    "Dentily builds scored lists of local dental practices for B2B outreach: priorities, explainable factors, and message drafts — one simple opportunity pack per market.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <AuthSessionProvider>
          <PostHogAnalyticsProvider>{children}</PostHogAnalyticsProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
