import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getDashboardSearches,
  getSubscriptionByUserId,
  type SubscriptionRow,
} from "@/lib/subscription-db";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard");
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId) || userId <= 0) {
    redirect("/login?next=/dashboard");
  }

  const [subscription, searches] = await Promise.all([
    getSubscriptionByUserId(userId),
    getDashboardSearches(userId),
  ]);

  return (
    <DashboardClient
      user={{
        id: String(userId),
        email: session.user.email ?? "",
        name: session.user.name ?? null,
      }}
      subscription={subscription as SubscriptionRow | null}
      searches={searches}
    />
  );
}
