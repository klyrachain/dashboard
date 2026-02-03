"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSession } from "next-auth/react";
import { setSession, clearSession } from "@/store/auth-slice";
import type { SessionUser } from "@/lib/auth";

/**
 * Sync NextAuth session (session key in JWT) to Redux so existing UI can read admin/token.
 */
export function AuthSessionSync({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.token) {
      dispatch(clearSession());
      return;
    }
    const user = session.user as SessionUser | undefined;
    if (!user?.id || !user?.email) {
      dispatch(clearSession());
      return;
    }
    dispatch(
      setSession({
        token: session.token,
        admin: {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          role: user.role,
        },
        expiresAt: session.expiresAt ?? user.expiresAt ?? "",
      })
    );
  }, [dispatch, session, status]);

  return <>{children}</>;
}
