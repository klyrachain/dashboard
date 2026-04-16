"use client";

import { useEffect } from "react";

/**
 * Syncs `klyra_portal_role` from server access context so middleware can enforce RBAC.
 */
export function PortalRoleCookieSync() {
  useEffect(() => {
    void fetch("/api/portal/role-sync", { method: "GET", credentials: "include" }).catch(
      () => {
        /* non-fatal */
      }
    );
  }, []);
  return null;
}
