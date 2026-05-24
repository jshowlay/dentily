import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LoginPageProps = {
  searchParams: { next?: string; plan?: string; error?: string };
};

const AUTH_ERROR_HINTS: Record<string, string> = {
  AccessDenied:
    "Google blocked sign-in. If your OAuth app is in Testing mode, add your Gmail under Google Cloud → OAuth consent screen → Audience → Test users.",
  Configuration:
    "Auth is misconfigured. Check AUTH_SECRET, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET in .env.local, then restart the dev server.",
  OAuthSignin: "Could not start Google sign-in. Confirm redirect URI http://localhost:3000/api/auth/callback/google in Google Cloud.",
  OAuthCallback: "Google callback failed. Confirm the redirect URI matches exactly and you are listed as a test user.",
};

const GOOGLE_CALLBACK_URI = `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/auth/callback/google`;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const next = searchParams.next ?? "/dashboard";
  if (session?.user) {
    redirect(next);
  }

  const plan = searchParams.plan;
  const authError = searchParams.error;
  const errorHint = authError ? AUTH_ERROR_HINTS[authError] ?? `Sign-in error: ${authError}` : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav />
      <section className="container-page flex justify-center py-16">
        <Card className="w-full max-w-md border-slate-200">
          <CardHeader>
            <CardTitle>Sign in to Dentily</CardTitle>
            <CardDescription>
              {plan === "starter"
                ? "Sign in to continue to checkout for your $49 lead pack."
                : "Access your dashboard, search credits, and saved leads."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorHint && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {errorHint}
              </p>
            )}
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
            {process.env.NODE_ENV === "development" && (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p className="font-medium text-slate-800">Google Cloud must match exactly:</p>
                <p className="mt-1 break-all">
                  <span className="font-medium">JavaScript origin:</span>{" "}
                  {process.env.AUTH_URL ?? "http://localhost:3000"}
                </p>
                <p className="mt-1 break-all">
                  <span className="font-medium">Redirect URI:</span> {GOOGLE_CALLBACK_URI}
                </p>
                <p className="mt-1">Client type: <strong>Web application</strong> (not Desktop).</p>
                <p className="mt-1">Open this site at <strong>localhost</strong>, not 127.0.0.1.</p>
              </div>
            )}
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
