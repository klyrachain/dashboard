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
    /** Set when session has passed expiresAt (Core session expired). */
    expired?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends SessionUser {
    exp?: number;
  }
}

/** Parse Core expiresAt (ISO string or Unix seconds) to ms. Only treat as absolute time if result is in the future or recent past. */
function parseExpiresAtMs(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") {
    if (Number.isNaN(raw)) return 0;
    return raw < 1e12 ? raw * 1000 : raw;
  }
  const s = String(raw).trim();
  if (!s) return 0;
  const asNum = Number(s);
  if (!Number.isNaN(asNum) && s === String(asNum)) {
    return asNum < 1e12 ? asNum * 1000 : asNum;
  }
  const ms = new Date(s).getTime();
  return Number.isNaN(ms) ? 0 : ms;
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
        token.name = u.admin.name ?? null;
        token.role = u.admin.role;
        token.expiresAt = u.expiresAt;
        const expiresAtMs = parseExpiresAtMs(u.expiresAt);
        if (expiresAtMs > 0) {
          token.exp = Math.floor(expiresAtMs / 1000);
        }
      }
      return token;
    },
    async session({ session, token }) {
      const expiresAtMs = parseExpiresAtMs(token.expiresAt as string | number | undefined);
      if (expiresAtMs > 0 && Date.now() > expiresAtMs) {
        return {
          ...session,
          user: { id: "", email: null, name: null, role: "viewer", token: "", expiresAt: "" },
          token: "",
          expiresAt: "",
          expired: true,
        };
      }
      if (session?.user) {
        (session.user as SessionUser).token = (token.token as string) ?? "";
        (session.user as SessionUser).id = (token.id != null ? String(token.id) : "") ?? "";
        (session.user as SessionUser).email = (token.email != null ? String(token.email) : "") ?? "";
        (session.user as SessionUser).name = (token.name as string | null) ?? null;
        (session.user as SessionUser).role = (token.role as AuthAdmin["role"]) ?? "viewer";
        (session.user as SessionUser).expiresAt = (token.expiresAt != null ? String(token.expiresAt) : "") ?? "";
      }
      session.token = (token.token as string) ?? "";
      session.expiresAt = (token.expiresAt != null ? String(token.expiresAt) : "") ?? "";
      session.expired = false;
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
 * Returns null if no session or if Core session has expired (expiresAt in the past).
 */
export async function getSessionToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session || (session as { expired?: boolean }).expired) return null;
  const expiresAt = session.expiresAt ?? (session?.user as SessionUser | undefined)?.expiresAt;
  if (expiresAt) {
    const ms = parseExpiresAtMs(expiresAt);
    if (ms > 0 && Date.now() > ms) return null;
  }
  const token = session?.token ?? (session?.user as SessionUser | undefined)?.token ?? null;
  return token ?? null;
}
