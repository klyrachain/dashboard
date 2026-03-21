/**
 * Business portal auth calls Core directly: `NEXT_PUBLIC_CORE_URL` + `/api/business-auth/*`.
 * Fallback: `NEXT_PUBLIC_BUSINESS_API_ORIGIN` if Core URL is not set.
 */
export function getBusinessAuthOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_CORE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BUSINESS_API_ORIGIN?.trim() ||
    "";
  return raw.replace(/\/$/, "");
}

/**
 * Dashboard base URL for login-code handoff (`/?login_code=...`).
 * Client: current origin. Server/build: `NEXT_PUBLIC_DASHBOARD_ORIGIN`.
 */
export function getBusinessDashboardUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN?.trim().replace(/\/$/, "") || ""
  );
}

/** @deprecated Use getBusinessAuthOrigin / getBusinessDashboardUrl */
export const env = {
  get businessApiOrigin() {
    return getBusinessAuthOrigin();
  },
  get businessDashboardUrl() {
    return getBusinessDashboardUrl();
  },
} as const;
