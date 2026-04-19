/**
 * Business portal: invoice CRUD via `/api/invoices/*` with Authorization + X-Business-Id
 * (same as list/detail). Server actions use NextAuth only — merchants must use these helpers.
 */

import {
  getBusinessAccessToken,
  getStoredActiveBusinessId,
  getStoredMerchantEnvironment,
} from "@/lib/businessAuthStorage";
import {
  buildInvoiceUpdatePatchBody,
  type InvoiceUpdatePayload,
} from "@/lib/data-invoices";
import {
  buildCreateCoreInvoiceRequestPayload,
  type CreateCoreInvoiceBody,
} from "@/lib/core-api";

function parseError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error: unknown }).error;
    if (typeof e === "string" && e.length > 0) return e;
  }
  return fallback;
}

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

export async function updateInvoiceViaMerchantProxy(
  invoiceId: string,
  payload: InvoiceUpdatePayload
): Promise<{ success: true } | { success: false; error: string }> {
  const baseHeaders = merchantHeaders();
  if (!baseHeaders) {
    return { success: false, error: "Sign in and select a business to update invoices." };
  }
  const body = buildInvoiceUpdatePatchBody(payload);
  const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`, {
    method: "PATCH",
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 409) {
    return {
      success: false,
      error: "Invoice cannot be edited (Paid or Cancelled).",
    };
  }
  if (!res.ok) {
    return {
      success: false,
      error: parseError(data, `Request failed (${res.status})`),
    };
  }
  return { success: true };
}

export async function markInvoicePaidViaMerchantProxy(
  invoiceId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const baseHeaders = merchantHeaders();
  if (!baseHeaders) {
    return { success: false, error: "Sign in and select a business to update invoices." };
  }
  const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/mark-paid`, {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      error: parseError(data, `Request failed (${res.status})`),
    };
  }
  return { success: true };
}

export async function cancelInvoiceViaMerchantProxy(
  invoiceId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const baseHeaders = merchantHeaders();
  if (!baseHeaders) {
    return { success: false, error: "Sign in and select a business to update invoices." };
  }
  const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      error: parseError(data, `Request failed (${res.status})`),
    };
  }
  return { success: true };
}

export async function duplicateInvoiceViaMerchantProxy(
  invoiceId: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const baseHeaders = merchantHeaders();
  if (!baseHeaders) {
    return { success: false, error: "Sign in and select a business to duplicate invoices." };
  }
  const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/duplicate`, {
    method: "POST",
    headers: { ...baseHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { id?: string };
    error?: string;
  };
  if (!res.ok) {
    return {
      success: false,
      error: parseError(data, `Request failed (${res.status})`),
    };
  }
  const id = data.data?.id;
  const idStr = typeof id === "string" && id.length > 0 ? id : undefined;
  if (!idStr) {
    return { success: false, error: "Duplicate succeeded but new invoice id was not returned." };
  }
  return { success: true, id: idStr };
}
