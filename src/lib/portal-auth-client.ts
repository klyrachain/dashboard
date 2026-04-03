/**
 * Clears HttpOnly `klyra_portal_role` when it was set for the business portal.
 * Call when signing in as platform admin so merchant and admin sessions do not mix.
 */
export async function clearMerchantPortalHttpOnlyCookie(): Promise<void> {
  await fetch("/api/portal/merchant-session", {
    method: "DELETE",
    credentials: "include",
  });
}
