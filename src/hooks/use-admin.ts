"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import type { RootState } from "@/store";
import type { AuthAdmin } from "@/types/auth";
import type { SessionUser } from "@/lib/auth";

/**
 * Returns the current admin (logged-in user) for display in header/settings.
 * Uses Redux first (synced by AuthSessionSync), then falls back to NextAuth session
 * so account details show even before or if Redux sync is delayed.
 */
export function useAdmin(): AuthAdmin | null {
  const reduxAdmin = useSelector((s: RootState) => s.auth.admin);
  const { data: session, status } = useSession();
  return useMemo(() => {
    let result: AuthAdmin | null = null;
    if (reduxAdmin?.id && reduxAdmin?.email) result = reduxAdmin;
    else if (status === "authenticated" && session?.user) {
      const u = session.user as SessionUser;
      if (u?.id && u?.email)
        result = {
          id: u.id,
          email: u.email,
          name: u.name ?? null,
          role: u.role ?? "viewer",
        };
    }
    return result;
  }, [reduxAdmin, session?.user, status]);
}
