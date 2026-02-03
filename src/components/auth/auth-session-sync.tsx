"use client";

import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useSession, signOut } from "next-auth/react";
import { setSession, clearSession } from "@/store/auth-slice";
import { getMe } from "@/lib/auth-api";
import { isAuthSuccess } from "@/types/auth";
import type { SessionUser } from "@/lib/auth";

function parseExpiresAtMs(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw < 1e12 ? raw * 1000 : raw;
  const s = String(raw).trim();
  if (!s) return 0;
  const asNum = Number(s);
  if (!Number.isNaN(asNum) && s === String(asNum)) return asNum < 1e12 ? asNum * 1000 : asNum;
  const ms = new Date(s).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function isExpired(expiresAt: string | number | null | undefined): boolean {
  const ms = parseExpiresAtMs(expiresAt);
  return ms > 0 && Date.now() > ms;
}

/**
 * Sync NextAuth session (session key in JWT) to Redux so existing UI can read admin/token.
 * Treats expired Core session (expiresAt in the past) as unauthenticated and signs out.
 * When session has a valid token but user id/email are missing (e.g. JWT shape), fetches
 * /api/auth/me and populates Redux so header and settings show account details.
 */
export function AuthSessionSync({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const { data: session, status, update } = useSession();
  const meFetchRef = useRef(false);

  useEffect(() => {
    update();
  }, [update]);

  useEffect(() => {
    if (status === "loading") return;
    const expired = (session as { expired?: boolean } | null)?.expired === true;
    const expiresAt = session?.expiresAt ?? (session?.user as SessionUser | undefined)?.expiresAt;
    if (!session?.token || expired || isExpired(expiresAt ?? null)) {
      dispatch(clearSession());
      if (session && (expired || isExpired(expiresAt ?? null))) {
        signOut({ callbackUrl: "/login", redirect: true });
      }
      meFetchRef.current = false;
      return;
    }
    const user = session.user as SessionUser | undefined;
    if (user?.id && user?.email) {
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
      meFetchRef.current = false;
      return;
    }
    // Valid token but session.user missing id/email — fetch /api/auth/me and sync to Redux
    if (!meFetchRef.current) {
      meFetchRef.current = true;
      getMe().then((res) => {
        if (isAuthSuccess(res) && res.data) {
          const { expiresAt: meExpiresAt, ...admin } = res.data;
          dispatch(
            setSession({
              token: session.token,
              admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name ?? null,
                role: admin.role,
              },
              expiresAt: meExpiresAt ?? session.expiresAt ?? "",
            })
          );
        } else {
          dispatch(clearSession());
        }
        meFetchRef.current = false;
      });
    }
  }, [dispatch, session, status]);

  return <>{children}</>;
}
