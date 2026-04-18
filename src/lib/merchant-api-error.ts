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

/** Human-readable detail from RTK Query / fetch `error` for merchant API failures. */
export function formatMerchantApiFetchError(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const e = error as { status?: number; data?: unknown };
  const parts: string[] = [];
  if (typeof e.status === "number") parts.push(`HTTP ${e.status}`);
  const d = e.data;
  if (d && typeof d === "object") {
    const o = d as { error?: unknown; code?: unknown; message?: unknown };
    if (typeof o.error === "string" && o.error.trim()) parts.push(o.error.trim());
    else if (typeof o.message === "string" && o.message.trim()) parts.push(o.message.trim());
    if (typeof o.code === "string" && o.code.trim()) parts.push(`(${o.code.trim()})`);
  }
  return parts.join(" — ");
}
