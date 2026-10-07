import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SAMPLE_COOKIE,
  isAdminPasswordConfigured,
  isAdminSampleSessionValid,
} from "@/lib/admin-sample-auth";
import { AdminSampleClient } from "@/app/admin/sample/admin-sample-client";
import { AdminSampleLogin } from "@/app/admin/sample/admin-sample-login";

export const metadata: Metadata = {
  title: "Admin · Sample leads",
  robots: { index: false, follow: false },
};

export default function AdminSamplePage() {
  if (!isAdminPasswordConfigured()) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <p className="text-sm text-white/80">
          Set <code className="rounded bg-white/10 px-1">ADMIN_PASSWORD</code> in the environment to use this tool.
        </p>
      </main>
    );
  }

  const session = cookies().get(ADMIN_SAMPLE_COOKIE)?.value;
  if (!isAdminSampleSessionValid(session)) {
    return <AdminSampleLogin />;
  }

  return <AdminSampleClient />;
}
