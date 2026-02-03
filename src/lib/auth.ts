/**
 * NextAuth config — session key (Bearer token from Core login) stored in JWT.
 * "Not authenticated. Provide x-api-key (platform) or Authorization: Bearer <session>."
 * User requests use the session key from this auth; platform requests use x-api-key.
 */

import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthAdmin } from "@/types/auth";

export type SessionUser = AuthAdmin & {
  token: string;
  expiresAt: string;
};

declare module "next-auth" {
  interface Session {
    user: SessionUser;
    token?: string;
    expiresAt?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends SessionUser { }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Session key",
      credentials: {
        token: { label: "Session key", type: "text" },
        admin: { label: "Admin", type: "text" },
        expiresAt: { label: "Expires", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token?.trim()) return null;
        let admin: AuthAdmin;
        try {
          admin = JSON.parse(credentials.admin ?? "{}") as AuthAdmin;
        } catch {
          return null;
        }
        if (!admin?.id || !admin?.email) return null;
        const token = credentials.token.trim();
        const expiresAt = credentials.expiresAt?.trim() ?? "";
        return { id: admin.id, email: admin.email, name: admin.name, image: null, token, admin, expiresAt };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user && "token" in user && "admin" in user && "expiresAt" in user) {
        const u = user as { token: string; admin: AuthAdmin; expiresAt: string };
        token.token = u.token;
        token.id = u.admin.id;
        token.email = u.admin.email;
        token.name = u.admin.name;
        token.role = u.admin.role;
        token.expiresAt = u.expiresAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as SessionUser).token = token.token as string;
        (session.user as SessionUser).id = token.id as string;
        (session.user as SessionUser).email = token.email as string;
        (session.user as SessionUser).name = token.name as string | null;
        (session.user as SessionUser).role = token.role as AuthAdmin["role"];
        (session.user as SessionUser).expiresAt = token.expiresAt as string;
      }
      session.token = token.token as string;
      session.expiresAt = token.expiresAt as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** 401 message when Core API is called without a session. */
export const UNAUTH_CORE_MESSAGE =
  "Not authenticated. Provide x-api-key (platform) or Authorization: Bearer <session>.";

/**
 * Get the session key (Bearer token) for the current request.
 * Use in API routes: call from a Route Handler (cookies sent automatically).
 */
export async function getSessionToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const token = session?.token ?? (session?.user as SessionUser | undefined)?.token ?? null;
  return token ?? null;
}
