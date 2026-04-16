/**
 * Sets HttpOnly merchant cookies (`klyra_portal_role` + `klyra_merchant_ssr`) after Core verifies the portal JWT.
 * Middleware requires both before SSR dashboard routes.
 */
export async function establishMerchantPortalSession(
  accessToken: string,
  options?: { signal?: AbortSignal }
): Promise<boolean> {
  const res = await fetch("/api/portal/merchant-session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    credentials: "include",
    signal: options?.signal,
  });
  return res.ok;
}
