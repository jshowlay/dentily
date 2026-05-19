import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertUserByEmail } from "@/lib/subscription-db";

const googleClientId = (
  process.env.GOOGLE_CLIENT_ID ??
  process.env.AUTH_GOOGLE_ID ??
  ""
).trim();
const googleClientSecret = (
  process.env.GOOGLE_CLIENT_SECRET ??
  process.env.AUTH_GOOGLE_SECRET ??
  ""
).trim();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      if (!process.env.DATABASE_URL) return true;
      try {
        const dbUser = await upsertUserByEmail(user.email, user.name);
        user.id = String(dbUser.id);
      } catch (e) {
        console.error("[auth] upsertUserByEmail failed", e);
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user?.email) token.email = user.email;
      if (user?.name) token.name = user.name;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
});

export async function requireUserId(): Promise<number | null> {
  const session = await auth();
  const raw = session?.user?.id;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}
