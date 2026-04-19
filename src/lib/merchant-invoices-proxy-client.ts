/**
 * Business portal: POST invoice create/send through `/api/invoices/*` with the same
 * Authorization + X-Business-Id headers as list/detail fetches (not NextAuth server actions).
 */

import {
  getBusinessAccessToken,
  getStoredActiveBusinessId,
  getStoredMerchantEnvironment,
} from "@/lib/businessAuthStorage";
import {
  buildCreateCoreInvoiceRequestPayload,
  type CreateCoreInvoiceBody,
} from "@/lib/core-api";

export function hasMerchantInvoicesAuth(): boolean {
  const t = getBusinessAccessToken()?.trim();
  const b = getStoredActiveBusinessId()?.trim();
  return Boolean(t && b);
}

function merchantHeaders(): Record<string, string> | null {
  const token = getBusinessAccessToken()?.trim();
  const businessId = getStoredActiveBusinessId()?.trim();
  if (!token || !businessId) return null;
  const h: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "X-Business-Id": businessId,
  };
  const env = getStoredMerchantEnvironment();
  if (env) h["x-merchant-environment"] = env;
  return h;
}

export async function createInvoiceViaMerchantProxy(
  body: CreateCoreInvoiceBody
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!body.lineItems?.length) {
    return { success: false, error: "At least one line item is required." };
  }
  const baseHeaders = merchantHeaders();
  if (!baseHeaders) {
    return { success: false, error: "Sign in and select a business to create invoices." };
  }
  const payload = buildCreateCoreInvoiceRequestPayload(body);
  const res = await fetch("/api/invoices", {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { id?: string };
    error?: string;
  };
  if (!res.ok) {
    return {
      success: false,
      error: typeof data.error === "string" ? data.error : `Request failed (${res.status})`,
    };
  }
  const id = data.data?.id;
  const idStr = typeof id === "string" && id.length > 0 ? id : undefined;
  if (!idStr) {
    return { success: false, error: "Invoice was created but no id was returned." };
  }
  return { success: true, id: idStr };
}

export async function sendInvoiceViaMerchantProxy(
  invoiceId: string,
  toEmail?: string
): Promise<{ success: true } | { success: false; error: string }> {
  const baseHeaders = merchantHeaders();
  if (!baseHeaders) {
    return { success: false, error: "Sign in and select a business to send invoices." };
  }
  const body = toEmail?.trim() ? { toEmail: toEmail.trim() } : {};
  const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/send`, {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!res.ok || data.success === false) {
    return {
      success: false,
      error: typeof data.error === "string" ? data.error : `Request failed (${res.status})`,
    };
  }
  return { success: true };
}
