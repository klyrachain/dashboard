/**
 * Validates relative return paths for business portal redirects (sign-in, invite flow).
 * Rejects protocol-relative and API paths to avoid open redirects.
 */
export function safeBusinessPortalReturnPath(returnTo: string | null): string {
  if (!returnTo?.trim()) return "/";
  const t = returnTo.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.startsWith("/api/")) {
    return "/";
  }
  return t;
}

/** `return_to` must point at the team invite accept page (includes invite token in query). */
export function isTeamInviteAcceptReturnPath(returnTo: string): boolean {
  const safe = safeBusinessPortalReturnPath(returnTo);
  const q = safe.indexOf("?");
  const pathname = q === -1 ? safe : safe.slice(0, q);
  return pathname === "/business/signup/team/invite";
}
