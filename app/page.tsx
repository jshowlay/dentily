import type { Metadata } from "next";
import { DentistLanding } from "@/components/dentist-landing";

export const metadata: Metadata = {
  title: "Find Dental Practices That Need Marketing Help | Dentily",
  description:
    "Dentily scores dental practices by growth opportunity so agencies and freelancers can do smarter outreach. Get 50 pitch-ready leads for your market.",
  openGraph: {
    title: "Find Dental Practices That Need Marketing Help | Dentily",
    description:
      "Scored dental practice leads for marketers and agencies. See why each practice is a fit before you reach out.",
    /** Resolve against `metadataBase` from `app/layout.tsx` (avoids host mismatch in dev / preview). */
    url: "/",
    type: "website",
  },
};

export default function Home() {
  return <DentistLanding />;
}
