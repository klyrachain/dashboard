/** Origin of the browser tab (for WebAuthn), when proxying to Core. */
export function getBrowserOriginForWebAuthn(request: Request): string | undefined {
  const o = request.headers.get("origin");
  if (o) return o;
  const ref = request.headers.get("referer");
  if (!ref) return undefined;
  try {
    return new URL(ref).origin;
  } catch {
    return undefined;
  }
}
