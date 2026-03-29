"use client";

import { useLayoutEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { mergeMerchantSessionWithStoredPortalJwt } from "@/lib/merchant-portal-bootstrap";
import { establishMerchantPortalSession } from "@/lib/establish-merchant-portal-session";
import { fetchBusinessSession } from "@/lib/businessAuthApi";
import {
  getStoredActiveBusinessId,
  setStoredActiveBusinessId,
} from "@/lib/businessAuthStorage";
import { hydrateMerchantSession } from "@/store/merchant-session-slice";
import type { MerchantSessionState } from "@/store/merchant-session-slice";

/**
 * Applies portal JWT from localStorage after the first paint so the initial client
 * render matches SSR (no merge in makeStore). Portal JWTs only carry `sub` (user id),
 * not business id — memberships come from GET /api/business-auth/session, which we
 * fetch here so `businesses` and `activeBusinessId` stay correct after reload.
 */
export function MerchantPortalReduxHydrate({
  serverSnapshot,
}: {
  serverSnapshot: Partial<MerchantSessionState> | null | undefined;
}) {
  const dispatch = useDispatch();
  const router = useRouter();
  const ran = useRef(false);

  useLayoutEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const merged = mergeMerchantSessionWithStoredPortalJwt(serverSnapshot ?? null);
    if (merged == null) return;

    const sessionType = merged.sessionType ?? "platform";
    dispatch(
      hydrateMerchantSession({
        sessionType,
        portalJwt: merged.portalJwt ?? null,
        businesses: merged.businesses ?? [],
        activeBusinessId: merged.activeBusinessId ?? null,
        merchantEnvironment: merged.merchantEnvironment ?? "LIVE",
        activeBusinessRole: merged.activeBusinessRole ?? null,
      })
    );

    const token = merged.portalJwt?.trim();
    if (sessionType !== "merchant" || !token) return;

    void (async () => {
      const cookieOk = await establishMerchantPortalSession(token);
      try {
        const session = await fetchBusinessSession(token);
        const businesses = session.businesses;
        const stored = getStoredActiveBusinessId()?.trim() ?? "";
        const validStored =
          stored.length > 0 && businesses.some((b) => b.id === stored)
            ? stored
            : null;
        const activeId =
          validStored ??
          (businesses.length > 0 ? businesses[0].id : null);
        const activeRole =
          activeId != null
            ? businesses.find((b) => b.id === activeId)?.role?.trim() ?? null
            : null;
        dispatch(
          hydrateMerchantSession({
            sessionType: "merchant",
            portalJwt: token,
            businesses,
            activeBusinessId: activeId,
            merchantEnvironment: merged.merchantEnvironment ?? "LIVE",
            activeBusinessRole: activeRole,
          })
        );
        if (activeId) {
          setStoredActiveBusinessId(activeId);
        }
      } catch {
        /* keep JWT merge; user may need to sign in again */
      }
      if (cookieOk) {
        router.refresh();
      }
    })();
  }, [dispatch, router, serverSnapshot]);

  return null;
}
