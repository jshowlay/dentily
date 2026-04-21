import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "Dentily internal admin — searches and leads.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
