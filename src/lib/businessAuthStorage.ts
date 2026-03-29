/**
 * Business portal persistence for the merchant JWT and related UI state.
 *
 * Security notes (no BFF / httpOnly migration here):
 * - The access token is stored in `localStorage`, so any XSS on this origin can read it.
 *   Mitigations: strict CSP where Next allows, input sanitization, dependency hygiene,
 *   and short-lived JWTs + rotation on the Core side.
 * - `klyra_portal_role` is set separately as an HttpOnly cookie via
 *   `POST /api/portal/merchant-session` for middleware only — it is not a substitute
 *   for protecting the bearer token.
 * - Tokens must never be logged or appended to URLs (query/hash).
 */

const TOKEN_KEY = "klyra_business_access_token";
const ACTIVE_BUSINESS_KEY = "klyra_active_business_id";
const MERCHANT_ENV_KEY = "klyra_merchant_environment";

/** Upper bound avoids storage DoS or accidental huge payloads. */
const MAX_JWT_CHARS = 12_000;

export type StoredMerchantEnvironment = "TEST" | "LIVE";

/** Compact JWT: three non-empty base64url segments. */
export function isPlausiblePortalJwt(token: string): boolean {
  const t = token.trim();
  if (!t || t.length > MAX_JWT_CHARS) return false;
  const parts = t.split(".");
  if (parts.length !== 3) return false;
  return parts.every(
    (p) => p.length > 0 && /^[A-Za-z0-9_-]+$/.test(p)
  );
}

/**
 * Persists the portal access token. Returns false if the value is not a plausible JWT
 * (malformed server response or tampering); callers should treat that as a hard failure.
 */
export function setBusinessAccessToken(token: string): boolean {
  if (typeof window === "undefined") return false;
  const t = token.trim();
  if (!isPlausiblePortalJwt(t)) return false;
  window.localStorage.setItem(TOKEN_KEY, t);
  return true;
}

export function getBusinessAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  if (!isPlausiblePortalJwt(raw)) {
    window.localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return raw.trim();
}

/** Persist selected tenant for `X-Business-Id` after reload (portal JWT may not include businessId). */
export function setStoredActiveBusinessId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_BUSINESS_KEY, id);
}

export function getStoredActiveBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_BUSINESS_KEY);
}

export function clearStoredActiveBusinessId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_BUSINESS_KEY);
}

export function clearBusinessAccessToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ACTIVE_BUSINESS_KEY);
  window.localStorage.removeItem(MERCHANT_ENV_KEY);
}

export function setStoredMerchantEnvironment(
  env: StoredMerchantEnvironment
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MERCHANT_ENV_KEY, env);
}

export function getStoredMerchantEnvironment():
  | StoredMerchantEnvironment
  | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(MERCHANT_ENV_KEY);
  if (v === "TEST" || v === "LIVE") return v;
  return null;
}
