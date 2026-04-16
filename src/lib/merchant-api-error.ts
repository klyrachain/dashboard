/** Extract Core merchant API `code` from RTK Query / fetch error shapes. */
export function getMerchantErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { status?: number; data?: unknown };
  const d = e.data;
  if (d && typeof d === "object" && "code" in d) {
    const c = (d as { code?: unknown }).code;
    return typeof c === "string" ? c : null;
  }
  return null;
}

export function isForbiddenMerchantRole(error: unknown): boolean {
  return getMerchantErrorCode(error) === "FORBIDDEN_MERCHANT_ROLE";
}
