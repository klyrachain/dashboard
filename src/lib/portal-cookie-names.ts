/** HttpOnly role cookie for middleware (platform | merchant). */
export const PORTAL_ROLE_COOKIE = "klyra_portal_role";

/**
 * HttpOnly flag set only after POST /api/portal/merchant-session verifies the portal JWT with Core.
 * Middleware requires this together with role=merchant before SSR dashboard routes run.
 */
export const MERCHANT_SSR_COOKIE = "klyra_merchant_ssr";
export const MERCHANT_SSR_VALUE = "1";
