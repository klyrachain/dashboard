"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import type { RootState } from "@/store";
import { useAdmin } from "@/hooks/use-admin";
import {
  merchantNavGroups,
  platformNavGroups,
  type NavGroupConfig,
} from "@/lib/nav-config";

/**
 * Dashboard nav and unauthenticated-shell UI from real auth (admin / merchant JWT), not sessionType alone.
 * Platform: NextAuth session, Redux token, or synced admin — avoids false "Sign in" while session is loading.
 */
export function useShellNav(): {
  navGroups: NavGroupConfig[];
  isUnauthedShell: boolean;
} {
  const sessionType = useSelector(
    (s: RootState) => s.merchantSession.sessionType
  );
  const portalJwt = useSelector((s: RootState) => s.merchantSession.portalJwt);
  const businesses = useSelector((s: RootState) => s.merchantSession.businesses);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const admin = useAdmin();
  const { status } = useSession();

  return useMemo(() => {
    const hasMerchantContext =
      sessionType === "merchant" &&
      (Boolean(portalJwt?.trim()) || businesses.length > 0);
    const hasPlatformContext =
      sessionType === "platform" &&
      (Boolean(admin?.id) ||
        Boolean(authToken?.trim()) ||
        status === "authenticated");
    /** Don’t show “Sign in” / empty nav while NextAuth is still resolving. */
    const isPendingPlatformSession =
      sessionType === "platform" && status === "loading";

    const isUnauthedShell =
      !hasMerchantContext &&
      !hasPlatformContext &&
      !isPendingPlatformSession;

    let navGroups: NavGroupConfig[];
    if (sessionType === "merchant" && hasMerchantContext) {
      navGroups = merchantNavGroups;
    } else if (sessionType === "platform" && hasPlatformContext) {
      navGroups = platformNavGroups;
    } else {
      navGroups = [];
    }

    return { navGroups, isUnauthedShell };
  }, [
    sessionType,
    portalJwt,
    businesses.length,
    admin?.id,
    authToken,
    status,
  ]);
}
