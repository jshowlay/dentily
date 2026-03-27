import { NicheConfig } from "@/lib/types";

export const dentistNicheConfig: NicheConfig = {
  id: "dentists",
  name: "Dentists",
  description: "Local dental practices focused on patient acquisition and appointment growth.",
  scoringFactors: [
    "outdated or missing website",
    "no visible online booking",
    "low review count (< 50)",
    "rating between 3.5 and 4.7 (improvable but not terrible)",
    "local private practice (not large chain)",
    "no obvious strong branding",
  ],
  disqualifiers: [
    "very large chains",
    "extremely high review count (over 500+ with strong branding)",
    "missing all contact info",
  ],
  outreachStyle:
    "friendly, professional, patient-growth focused; mention new patients and appointments or bookings.",
  idealCustomerDescription:
    "local dental practice that wants more patients and better online conversion",
};
