/**
 * Invoice types and Core API data layer.
 * All amounts and currency are USD. Dates from API are ISO 8601; we map to Date for app use.
 */

import { getSessionToken } from "@/lib/auth";
import {
  getCoreInvoices,
  getCoreInvoice,
} from "@/lib/core-api";

export type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "Draft" | "Cancelled";

export type InvoiceLineItem = {
  id: string;
  productName: string;
  productImageUrl?: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type InvoiceLogEntry = {
  id: string;
  description: string;
  date: Date;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  currencyLabel?: string;
  paidAt: Date | null;
  batchTitle: string;
  billedTo: string;
  billingDetails: string;
  subject: string;
  issued: Date;
  dueDate: Date;
  notes: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  amountDue: number;
  termsAndConditions: string;
  notesContent: string;
  log: InvoiceLogEntry[];
};

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  customer: string;
  issued: Date;
  dueDate: Date;
  paidAt: Date | null;
};

/** API list item shape (ISO date strings). */
type CoreInvoiceListItemRaw = {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number;
  currency: string;
  customer: string;
  issued: string;
  dueDate: string;
  paidAt: string | null;
};

/** API full invoice shape (ISO date strings, log entries with date string). */
type CoreInvoiceRaw = {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number;
  currency: string;
  currencyLabel?: string;
  paidAt: string | null;
  batchTitle: string;
  billedTo: string;
  billingDetails: string;
  subject: string;
  issued: string;
  dueDate: string;
  notes: string | null;
  lineItems: Array<{
    id: string;
    productName: string;
    qty: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  amountDue: number;
  termsAndConditions: string;
  notesContent: string;
  log: Array<{ id: string; description: string; date: string }>;
};

function parseDate(s: string | null | undefined): Date | null {
  if (s == null || s === "") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapListItem(raw: CoreInvoiceListItemRaw): InvoiceListItem {
  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber,
    status: raw.status as InvoiceStatus,
    amount: raw.amount,
    currency: raw.currency,
    customer: raw.customer,
    issued: parseDate(raw.issued) ?? new Date(0),
    dueDate: parseDate(raw.dueDate) ?? new Date(0),
    paidAt: parseDate(raw.paidAt),
  };
}

function mapInvoice(raw: CoreInvoiceRaw): Invoice {
  return {
    id: raw.id,
    invoiceNumber: raw.invoiceNumber,
    status: raw.status as InvoiceStatus,
    amount: raw.amount,
    currency: raw.currency,
    currencyLabel: raw.currencyLabel,
    paidAt: parseDate(raw.paidAt),
    batchTitle: raw.batchTitle ?? "",
    billedTo: raw.billedTo,
    billingDetails: raw.billingDetails ?? "",
    subject: raw.subject,
    issued: parseDate(raw.issued) ?? new Date(0),
    dueDate: parseDate(raw.dueDate) ?? new Date(0),
    notes: raw.notes ?? null,
    lineItems: (raw.lineItems ?? []).map((li) => ({
      id: li.id,
      productName: li.productName,
      qty: li.qty,
      unitPrice: li.unitPrice,
      amount: li.amount,
    })),
    subtotal: raw.subtotal ?? 0,
    discountPercent: raw.discountPercent ?? 0,
    discountAmount: raw.discountAmount ?? 0,
    total: raw.total ?? raw.amount,
    amountDue: raw.amountDue ?? raw.total ?? raw.amount,
    termsAndConditions: raw.termsAndConditions ?? "",
    notesContent: raw.notesContent ?? "",
    log: (raw.log ?? []).map((e) => ({
      id: e.id,
      description: e.description,
      date: parseDate(e.date) ?? new Date(0),
    })),
  };
}

/** Parse Core GET /api/invoices/:id `data` payload (e.g. client fetch via BFF). */
export function invoiceFromCoreApiData(raw: unknown): Invoice | null {
  if (!raw || typeof raw !== "object") return null;
  return mapInvoice(raw as CoreInvoiceRaw);
}

export type InvoiceListResult = {
  items: InvoiceListItem[];
  meta: { page: number; limit: number; total: number };
  /** Set when Core API is unreachable or returns an error (e.g. 404). */
  error?: string;
};

/**
 * List invoices from Core API with pagination and optional status filter.
 * Never throws; returns empty items and optional error message if Core is unreachable.
 */
export async function getInvoiceList(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<InvoiceListResult> {
  const defaultMeta = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    total: 0,
  };

  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCoreInvoices(
      {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        status: params?.status,
      },
      token ?? undefined
    );

    const envelope =
      data && typeof data === "object"
        ? (data as {
          success?: boolean;
          data?: unknown[];
          meta?: { page: number; limit: number; total: number };
          error?: string;
        })
        : null;

    const errorMessage =
      envelope && "error" in envelope && typeof envelope.error === "string"
        ? envelope.error
        : status === 404
          ? "Not Found"
          : !ok
            ? "Request failed"
            : null;

    if (!ok || errorMessage) {
      return {
        items: [],
        meta: defaultMeta,
        error: errorMessage ?? "Unable to load invoices",
      };
    }

    if (envelope?.success === false) {
      return {
        items: [],
        meta: defaultMeta,
        error: envelope.error ?? "Request failed",
      };
    }

    const list = Array.isArray(envelope?.data) ? envelope.data : [];
    const meta = envelope?.meta ?? {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      total: list.length,
    };

    return {
      items: list.map((row) => mapListItem(row as CoreInvoiceListItemRaw)),
      meta,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to load invoices";
    return { items: [], meta: defaultMeta, error: message };
  }
}

/**
 * Get full invoice by id from Core API. Returns null if 404 or error. Never throws.
 */
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const token = await getSessionToken();
    const { ok, data } = await getCoreInvoice(id, token ?? undefined);

    if (!ok || !data || typeof data !== "object") return null;

    const envelope = data as { success?: boolean; data?: unknown };
    if (!envelope.success) return null;
    const raw = envelope.data;
    if (!raw || typeof raw !== "object") return null;

    return mapInvoice(raw as CoreInvoiceRaw);
  } catch {
    return null;
  }
}

export type InvoiceUpdatePayload = {
  subject?: string;
  dueDate?: string;
  notes?: string | null;
  notesContent?: string;
  billedTo?: string;
  billingDetails?: string;
  lineItems?: InvoiceLineItem[];
  termsAndConditions?: string;
};

/** JSON body for PATCH /api/invoices/:id (Core + `/api/invoices` proxy). */
export function buildInvoiceUpdatePatchBody(
  payload: InvoiceUpdatePayload
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.subject != null) body.subject = payload.subject;
  if (payload.dueDate != null) body.dueDate = payload.dueDate;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.notesContent != null) body.notesContent = payload.notesContent;
  if (payload.billedTo != null) body.billedTo = payload.billedTo;
  if (payload.billingDetails != null) body.billingDetails = payload.billingDetails;
  if (payload.termsAndConditions != null) body.termsAndConditions = payload.termsAndConditions;
  if (payload.lineItems != null) {
    body.lineItems = payload.lineItems.map((li) => ({
      id: li.id,
      productName: li.productName,
      qty: li.qty,
      unitPrice: li.unitPrice,
      amount: li.amount,
    }));
  }
  return body;
}

/** Serialized shape for passing invoice from server to client. */
export type SerializedInvoice = Omit<
  Invoice,
  "paidAt" | "issued" | "dueDate" | "log"
> & {
  paidAt: string | null;
  issued: string;
  dueDate: string;
  log: Array<Omit<InvoiceLogEntry, "date"> & { date: string }>;
};

export function serializeInvoice(inv: Invoice): SerializedInvoice {
  return {
    ...inv,
    paidAt: inv.paidAt?.toISOString() ?? null,
    issued: inv.issued.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    log: inv.log.map((e) => ({ ...e, date: e.date.toISOString() })),
  };
}

function formatCurrency(amount: number, currency: string): string {
  const code = /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

export { formatCurrency as formatInvoiceCurrency };
