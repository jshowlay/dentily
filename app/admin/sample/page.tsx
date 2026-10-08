import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SAMPLE_COOKIE,
  isAdminPasswordConfigured,
  isAdminSampleSessionValid,
} from "@/lib/admin-sample-auth";
import { AdminSampleClient } from "@/app/admin/sample/admin-sample-client";
import { AdminSampleLogin } from "@/app/admin/sample/admin-sample-login";
import { AdminSampleShell } from "@/components/admin/admin-sample-shell";

export const metadata: Metadata = {
  title: "Admin · Sample leads",
  robots: { index: false, follow: false },
};

export default function AdminSamplePage() {
  if (!isAdminPasswordConfigured()) {
    return (
      <AdminSampleShell>
        <p className="dr-crumb">Admin · sample leads</p>
        <h1 className="dr-title dr-serif">Not configured</h1>
        <p className="dr-subtitle">
          Set <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">ADMIN_PASSWORD</code> in the
          environment to use this tool.
        </p>
      </AdminSampleShell>
    );
  }

  const session = cookies().get(ADMIN_SAMPLE_COOKIE)?.value;
  if (!isAdminSampleSessionValid(session)) {
    return <AdminSampleLogin />;
  }

  return <AdminSampleClient />;
}
