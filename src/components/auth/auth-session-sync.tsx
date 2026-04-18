"use client";

import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useSession, signOut } from "next-auth/react";
import { setSession, clearSession, setAdmin, setSessionExpiresAt } from "@/store/auth-slice";
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
/** Call from logout handlers so next load will try getMe() again when status is unauthenticated. */
let unauthenticatedMeDidTry = false;
export function resetAuthSessionSyncRef(): void {
  unauthenticatedMeDidTry = false;
}

export function AuthSessionSync({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const { data: session, status, update } = useSession();
  const meFetchRef = useRef(false);
  const unauthenticatedMeRef = useRef(false);
  const updateCalledRef = useRef(false);
  const signOutOnExpiredRef = useRef(false);

  useEffect(() => {
    if (updateCalledRef.current) return;
    updateCalledRef.current = true;
    update();
  }, [update]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (status === "unauthenticated") {
      if (!unauthenticatedMeRef.current && !unauthenticatedMeDidTry) {
        unauthenticatedMeRef.current = true;
        unauthenticatedMeDidTry = true;

        getMe().then((res) => {
          const ok = isAuthSuccess(res) && !!res.data;

          if (ok && res.data) {
            const raw = res.data as Record<string, unknown>;
            const inner =
              raw?.data != null && typeof raw.data === "object"
                ? (raw.data as Record<string, unknown>)
                : raw;
            const meData = inner as Record<string, unknown> & { expiresAt?: string };
            const { expiresAt, ...admin } = meData;
            const id = (admin?.id ?? admin?.adminId) != null ? String(admin.id ?? admin.adminId) : "";
            const email = admin?.email != null ? String(admin.email) : "";
            if (id && email) {
              const payload = {
                id,
                email,
                name: (admin?.name as string | null) ?? null,
                role: (admin?.role as "super_admin" | "support" | "developer" | "viewer") ?? "viewer",
              };
              dispatch(setAdmin(payload));
              dispatch(
                setSessionExpiresAt(typeof expiresAt === "string" && expiresAt.trim() ? expiresAt : null)
              );
            } else {
              unauthenticatedMeDidTry = false;
              dispatch(clearSession());
            }
          } else {
            unauthenticatedMeDidTry = false;
            dispatch(clearSession());
          }
        });
      }
      return;
    }
    const expired = (session as { expired?: boolean } | null)?.expired === true;
    const expiresAt = session?.expiresAt ?? (session?.user as SessionUser | undefined)?.expiresAt;
    const hasToken = !!session?.token;
    const tokenExpired = isExpired(expiresAt ?? null);
    if (!hasToken || expired || tokenExpired) {
      unauthenticatedMeDidTry = false;
      dispatch(clearSession());
      if (session && (expired || tokenExpired) && !signOutOnExpiredRef.current) {
        signOutOnExpiredRef.current = true;
        signOut({ callbackUrl: "/login", redirect: true });
      }
      meFetchRef.current = false;
      return;
    }
    const user = session.user as SessionUser | undefined;
    const userHasIdEmail = !!(user?.id && user?.email);
    if (userHasIdEmail) {
      dispatch(
        setSession({
          token: session.token ?? "",
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
        const ok = isAuthSuccess(res) && !!res.data;
        if (ok && res.data) {
          const raw = res.data as Record<string, unknown>;
          const inner =
            raw?.data != null && typeof raw.data === "object"
              ? (raw.data as Record<string, unknown>)
              : raw;
          const meData = inner as Record<string, unknown> & { expiresAt?: string };
          const { expiresAt: meExpiresAt, ...admin } = meData;
          const id = (admin?.id ?? admin?.adminId) != null ? String(admin.id ?? admin.adminId) : "";
          const email = admin?.email != null ? String(admin.email) : "";
          if (id && email) {
            dispatch(
              setSession({
                token: session.token ?? "",
                admin: {
                  id,
                  email,
                  name: (admin.name as string | null) ?? null,
                  role: (admin.role as "super_admin" | "support" | "developer" | "viewer") ?? "viewer",
                },
                expiresAt: (meExpiresAt as string) ?? session.expiresAt ?? "",
              })
            );
          } else {
            unauthenticatedMeDidTry = false;
            dispatch(clearSession());
          }
        } else {
          unauthenticatedMeDidTry = false;
          dispatch(clearSession());
        }
        meFetchRef.current = false;
      });
    }
  }, [dispatch, session, status]);

  return <>{children}</>;
}
