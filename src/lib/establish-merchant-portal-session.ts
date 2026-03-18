/**
 * Sets HttpOnly `klyra_portal_role=merchant` after portal JWT is obtained.
 * Required so middleware allows merchant navigation.
 */
export async function establishMerchantPortalSession(
  accessToken: string
): Promise<boolean> {
  const res = await fetch("/api/portal/merchant-session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    credentials: "include",
  });
  return res.ok;
}
