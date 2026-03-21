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
 * Public URL shown for copy/QR. Prefer `NEXT_PUBLIC_PAYMENT_LINK_BASE_URL`
 * (no trailing slash), e.g. `https://pay.example.com`.
 */
export function getPaymentLinkBaseUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const env = process.env.NEXT_PUBLIC_PAYMENT_LINK_BASE_URL?.trim().replace(
    /\/$/,
    ""
  );
  if (env) return env;
  return `${window.location.origin}/pay`;
}

export function buildPaymentLinkPublicUrl(slug: string): string {
  const base = getPaymentLinkBaseUrl();
  return base ? `${base}/${encodeURIComponent(slug)}` : "";
}

export function parsePrice(value: string | undefined | null): number {
  if (value == null || value === "") return Number.NaN;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : Number.NaN;
}
