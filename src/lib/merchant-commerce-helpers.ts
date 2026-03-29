/** Client-side helpers for merchant commerce UIs (catalog, links, payers). */

export function aggregateProductPurchaseCounts(
  transactions: Record<string, unknown>[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    const pid = t.productId ?? t.product_id;
    if (typeof pid === "string" && pid.length > 0) {
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Public checkout URL for a payment link.
 * Prefer `publicCode` when building URLs so paths are opaque; fall back to `slug`.
 * `checkoutBase` must be the payer app origin (from Core or env), no trailing slash.
 */
export function buildPaymentLinkPublicUrl(
  checkoutCode: string,
  checkoutBase: string
): string {
  const base = checkoutBase?.trim().replace(/\/$/, "");
  if (!base) return "";
  return `${base}/checkout/${encodeURIComponent(checkoutCode)}`;
}

export function parsePrice(value: string | undefined | null): number {
  if (value == null || value === "") return Number.NaN;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : Number.NaN;
}
