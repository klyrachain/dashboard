/** HttpOnly role cookie for middleware (platform | merchant). */
export const PORTAL_ROLE_COOKIE = "klyra_portal_role";

/**
 * HttpOnly flag set only after POST /api/portal/merchant-session verifies the portal JWT with Core.
 * Middleware requires this together with role=merchant before SSR dashboard routes run.
 */
export const MERCHANT_SSR_COOKIE = "klyra_merchant_ssr";
export const MERCHANT_SSR_VALUE = "1";

/** HttpOnly: portal JWT for server-side Core calls (e.g. GET /api/requests). Set by POST /api/portal/merchant-session. */
export const PORTAL_JWT_COOKIE = "klyra_portal_jwt";
/** HttpOnly: active business UUID for portal-scoped Core routes. */
export const PORTAL_BUSINESS_ID_COOKIE = "klyra_portal_business_id";
/** HttpOnly: `TEST` | `LIVE` for portal-scoped Core routes. */
export const PORTAL_MERCHANT_ENV_COOKIE = "klyra_portal_merchant_env";
