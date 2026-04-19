/** Client-side helpers for merchant commerce UIs (catalog, links, payers). */

import type {
  MerchantPayPageCartSnapshot,
  MerchantPayPageRow,
} from "@/types/merchant-api";

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

/** Open amount / pay-what-you-want when amount is missing or not a positive number. */
export function isMerchantPayPageOpenAmount(row: {
  amount?: string | null;
}): boolean {
  const a = row.amount;
  if (a == null || a === "") return true;
  const n = parseFloat(String(a));
  return !Number.isFinite(n) || n <= 0;
}

/** Short label for QR and summaries (not localized). */
export function formatMerchantPayPagePriceLabel(row: MerchantPayPageRow): string {
  if (isMerchantPayPageOpenAmount(row)) return "Customer decides";
  return `${String(row.amount)} ${(row.currency ?? "USD").trim()}`;
}

const CART_VERSION = 1 as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/** Read a validated cart snapshot from `PaymentLink.metadata`, if present. */
export function parsePaymentLinkCartMetadata(
  metadata: unknown
): MerchantPayPageCartSnapshot | null {
  if (!isRecord(metadata)) return null;
  const cart = metadata.cart;
  if (!isRecord(cart)) return null;
  if (cart.v !== CART_VERSION) return null;
  const linesRaw = cart.lines;
  if (!Array.isArray(linesRaw) || linesRaw.length === 0) return null;
  const lines: MerchantPayPageCartSnapshot["lines"] = [];
  for (const li of linesRaw) {
    if (!isRecord(li)) continue;
    const pidRaw = li.productId;
    const productId =
      typeof pidRaw === "string" && pidRaw.trim().length > 0 ? pidRaw.trim() : undefined;
    const name = typeof li.name === "string" ? li.name : "";
    const quantity = typeof li.quantity === "number" ? li.quantity : Number(li.quantity);
    const unitPrice = typeof li.unitPrice === "number" ? li.unitPrice : Number(li.unitPrice);
    if (!name.trim() || !Number.isFinite(quantity) || quantity <= 0) continue;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
    lines.push(
      productId
        ? { productId, name, quantity, unitPrice }
        : { name, quantity, unitPrice }
    );
  }
  if (lines.length === 0) return null;
  const discountPercent =
    typeof cart.discountPercent === "number"
      ? cart.discountPercent
      : cart.discountPercent != null
        ? Number(cart.discountPercent)
        : undefined;
  const discountAmount =
    typeof cart.discountAmount === "number"
      ? cart.discountAmount
      : cart.discountAmount != null
        ? Number(cart.discountAmount)
        : undefined;
  return {
    v: CART_VERSION,
    lines,
    ...(Number.isFinite(discountPercent) && discountPercent! > 0
      ? { discountPercent: Math.min(100, Math.max(0, discountPercent!)) }
      : {}),
    ...(Number.isFinite(discountAmount) && discountAmount! > 0
      ? { discountAmount: Math.max(0, discountAmount!) }
      : {}),
  };
}

export function computePaymentLinkCartSubtotal(
  lines: Array<{ quantity: number; unitPrice: number }>
): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
}

/** Applies percent of subtotal plus a fixed amount, capped so total discount never exceeds subtotal. */
export function computePaymentLinkCartDiscountTotal(params: {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
}): number {
  const sub = Math.max(0, params.subtotal);
  const p = Math.max(0, Math.min(100, params.discountPercent));
  const fromPercent = sub * (p / 100);
  const fromFixed = Math.max(0, params.discountAmount);
  return Math.min(sub, fromPercent + fromFixed);
}

export function computePaymentLinkCartTotal(params: {
  lines: Array<{ quantity: number; unitPrice: number }>;
  discountPercent: number;
  discountAmount: number;
}): number {
  const sub = computePaymentLinkCartSubtotal(params.lines);
  const disc = computePaymentLinkCartDiscountTotal({
    subtotal: sub,
    discountPercent: params.discountPercent,
    discountAmount: params.discountAmount,
  });
  return Math.max(0, sub - disc);
}

export function getPaymentLinkCartLineCount(row: { metadata?: unknown }): number {
  return parsePaymentLinkCartMetadata(row.metadata)?.lines.length ?? 0;
}

/**
 * Table helper: linked catalog summary (multi item cart vs single product vs open).
 */
export function formatPaymentLinkCatalogCell(
  row: MerchantPayPageRow,
  productNameById: Map<string, string>
): string {
  const cart = parsePaymentLinkCartMetadata(row.metadata);
  if (cart && cart.lines.length > 1) {
    return `${cart.lines.length} line items`;
  }
  if (cart && cart.lines.length === 1) {
    return cart.lines[0]!.name;
  }
  const pid = row.productId?.trim();
  if (pid) {
    const name = productNameById.get(pid);
    return name ?? `${pid.slice(0, 8)}…`;
  }
  return "Open amount";
}
