import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LoginPageProps = {
  searchParams: { next?: string; plan?: string };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const next = searchParams.next ?? "/dashboard";
  if (session?.user) {
    redirect(next);
  }

  const plan = searchParams.plan;

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav />
      <section className="container-page flex justify-center py-16">
        <Card className="w-full max-w-md border-slate-200">
          <CardHeader>
            <CardTitle>Sign in to Dentily</CardTitle>
            <CardDescription>
              {plan === "pro"
                ? "Create your account to start Dentily Pro ($99/mo)."
                : "Access your dashboard, search credits, and saved leads."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: next });
              }}
            >
              <button
                type="submit"
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Continue with Google
              </button>
            </form>
            <p className="text-center text-xs text-slate-500">
              By signing in you agree to use Dentily for B2B outreach to dental practices.
            </p>
            <p className="text-center text-sm text-slate-600">
              <Link href="/pricing" className="font-medium text-slate-900 underline-offset-4 hover:underline">
                View pricing
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
