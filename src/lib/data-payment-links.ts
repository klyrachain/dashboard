/**
 * Payment link / request data from Core API.
 */
import { getSessionToken } from "@/lib/auth";
import { getCoreRequests } from "@/lib/core-api";

export type PaymentLinkStatus =
  | "Pending"
  | "Paid"
  | "Expired"
  | "Cancelled";

export type PaymentLinkRow = {
  id: string;
  amount: string;
  currency: string;
  customer: string;
  requested: Date;
  invoiceNo: string | null;
  status: PaymentLinkStatus;
  code: string;
  offlineReference: string;
};

export type PaymentLinksResult = {
  items: PaymentLinkRow[];
  error?: string;
};

type CoreRequestRow = {
  id?: string;
  linkId?: string | null;
  code?: string | null;
  createdAt?: string;
  transaction?: {
    id?: string;
    f_amount?: string;
    t_amount?: string;
    f_token?: string | null;
    t_token?: string | null;
    fromIdentifier?: string | null;
    status?: string | null;
  } | null;
};

function mapStatus(statusRaw: string | null | undefined): PaymentLinkStatus {
  const status = (statusRaw ?? "").toUpperCase();
  if (status === "COMPLETED") return "Paid";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "FAILED" || status === "EXPIRED") return "Expired";
  return "Pending";
}

function mapRequestToPaymentLink(row: CoreRequestRow): PaymentLinkRow | null {
  const id = row.id ?? "";
  if (!id) return null;
  const tx = row.transaction ?? null;
  const amountRaw = tx?.f_amount ?? tx?.t_amount ?? "0";
  const amount = Number.parseFloat(String(amountRaw));
  const symbol = tx?.f_token?.trim() || tx?.t_token?.trim() || "USD";
  const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
  return {
    id,
    amount: Number.isFinite(amount) ? String(amount) : "0",
    currency: symbol,
    customer: tx?.fromIdentifier?.trim() || "Unknown",
    requested: createdAt,
    invoiceNo: null,
    status: mapStatus(tx?.status),
    code: row.code?.trim() || row.linkId?.trim() || id,
    offlineReference: tx?.id ?? id,
  };
}

export async function getPaymentLinks(params?: {
  page?: number;
  limit?: number;
}): Promise<PaymentLinksResult> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 100;
  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCoreRequests(
      { page, limit },
      token ?? undefined
    );
    if (!ok || !data || typeof data !== "object") {
      return {
        items: [],
        error: status === 404 ? "Not Found" : "Unable to load payment links",
      };
    }
    const envelope = data as {
      success?: boolean;
      data?: unknown[];
      error?: string;
    };
    if (envelope.success === false) {
      return {
        items: [],
        error: envelope.error ?? "Unable to load payment links",
      };
    }
    const list = Array.isArray(envelope.data) ? envelope.data : [];
    const items = list
      .map((row) => mapRequestToPaymentLink(row as CoreRequestRow))
      .filter((row): row is PaymentLinkRow => row !== null);
    return { items };
  } catch (error) {
    return {
      items: [],
      error:
        error instanceof Error ? error.message : "Unable to load payment links",
    };
  }
}
