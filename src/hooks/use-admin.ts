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
    if (reduxAdmin?.id && reduxAdmin?.email) return reduxAdmin;
    if (status !== "authenticated" || !session?.user) return null;
    const user = session.user as SessionUser;
    if (!user?.id || !user?.email) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role ?? "viewer",
    };
  }, [reduxAdmin, session?.user, status]);
}
