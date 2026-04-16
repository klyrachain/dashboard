/** Default sign-in for business (merchant) users — not platform admin `/login`. */
export const BUSINESS_SIGNIN_PATH = "/business/signin";

/**
 * Link to business sign-in with optional session restore and return path.
 * Use for shell CTAs when the user is not authenticated.
 */
export function businessSignInHref(returnToPath: string): string {
  const safe =
    returnToPath.startsWith("/") &&
    !returnToPath.startsWith("//") &&
    !returnToPath.startsWith("/api/")
      ? returnToPath
      : "/";
  const query = new URLSearchParams({
    session_bootstrap: "1",
    return_to: safe,
  });
  return `${BUSINESS_SIGNIN_PATH}?${query.toString()}`;
}
