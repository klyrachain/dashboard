/**
 * Sets HttpOnly merchant cookies (role flags + portal JWT / business / env for SSR Core calls)
 * after Core verifies the portal JWT. Middleware requires role cookies before SSR dashboard routes.
 */
export async function establishMerchantPortalSession(
  accessToken: string,
  options?: {
    signal?: AbortSignal;
    /** Active tenant UUID — forwarded so GET /api/requests can scope server-side. */
    businessId?: string | null;
    merchantEnvironment?: "TEST" | "LIVE" | null;
  }
): Promise<boolean> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
  const bid = options?.businessId?.trim();
  if (bid) headers["X-Business-Id"] = bid;
  const env = options?.merchantEnvironment;
  if (env === "TEST" || env === "LIVE") {
    headers["x-merchant-environment"] = env;
  }
  const res = await fetch("/api/portal/merchant-session", {
    method: "POST",
    headers,
    credentials: "include",
    signal: options?.signal,
  });
  return res.ok;
}
