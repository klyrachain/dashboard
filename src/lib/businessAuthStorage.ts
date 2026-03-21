const TOKEN_KEY = "klyra_business_access_token";
const ACTIVE_BUSINESS_KEY = "klyra_active_business_id";
const MERCHANT_ENV_KEY = "klyra_merchant_environment";

export type StoredMerchantEnvironment = "TEST" | "LIVE";

export function setBusinessAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getBusinessAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
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

