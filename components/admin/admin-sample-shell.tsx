import { SiteHeader } from "@/components/landing/site-header";

export function AdminSampleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dentily-results">
      <SiteHeader />
      <div className="dr-main mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}
