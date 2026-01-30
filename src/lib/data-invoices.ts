/**
 * Invoice types and mock data. In-memory store for CRUD until Core API is wired.
 * All amounts and currency are USD.
 */

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

const DEFAULT_CURRENCY = "USD";

function formatCurrency(amount: number, _currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** In-memory store (replaced by Core API when wired). */
const invoiceStore: Map<string, Invoice> = new Map();

function nextId(prefix: string): string {
  const existing = Array.from(invoiceStore.keys()).filter((k) =>
    k.startsWith(prefix)
  );
  const max = existing.reduce((m, k) => {
    const n = Number.parseInt(k.replace(prefix, ""), 10) || 0;
    return Math.max(m, n);
  }, 0);
  return `${prefix}${max + 1}`;
}

function nextInvoiceNumber(): string {
  const all = Array.from(invoiceStore.values());
  const numbers = all
    .map((i) => i.invoiceNumber.replace(/\D/g, ""))
    .filter(Boolean)
    .map(Number);
  const max = numbers.length ? Math.max(...numbers) : 425709010;
  return `INV4257-09-${String(max + 1).padStart(3, "0")}`;
}

function seedStore(): void {
  if (invoiceStore.size > 0) return;
  const inv1: Invoice = {
    id: "inv_1",
    invoiceNumber: "INV4257-09-011",
    status: "Paid",
    amount: 220.5,
    currency: DEFAULT_CURRENCY,
    currencyLabel: "USD - US Dollar",
    paidAt: new Date(2023, 0, 25),
    batchTitle: "Payment batch January 2023",
    billedTo: "john_s@gmail.com",
    billingDetails: "John Smith",
    subject: "Service per January 2023",
    issued: new Date(2023, 0, 20),
    dueDate: new Date(2023, 0, 30),
    notes: null,
    lineItems: [
      {
        id: "li_1",
        productName: "ModishMonochrome Track Suit",
        qty: 1,
        unitPrice: 120,
        amount: 120,
      },
      {
        id: "li_2",
        productName: "Summer 2K23 T-shirt",
        qty: 1,
        unitPrice: 125,
        amount: 125,
      },
    ],
    subtotal: 245,
    discountPercent: 10,
    discountAmount: 24.5,
    total: 220.5,
    amountDue: 220.5,
    termsAndConditions:
      "Please ensure payment is made by the due date to avoid any late fees. Payment is due on or before the due date.",
    notesContent:
      "Please ensure payment is made by the due date to avoid any late fees.",
    log: [
      { id: "log_1", description: "Invoice was sent to john_s@gmail.com", date: new Date(2023, 0, 22, 13, 28) },
      { id: "log_2", description: "Invoice was finalized", date: new Date(2023, 0, 22, 13, 28) },
      { id: "log_3", description: "Invoice Payment page was created", date: new Date(2023, 0, 20, 10, 28) },
    ],
  };
  const inv2: Invoice = {
    id: "inv_2",
    invoiceNumber: "INV4257-09-012",
    status: "Pending",
    amount: 150,
    currency: DEFAULT_CURRENCY,
    currencyLabel: "USD - US Dollar",
    paidAt: null,
    batchTitle: "Payment batch January 2026",
    billedTo: "pixelhubster@gmail.com",
    billingDetails: "Pixel Hubster",
    subject: "Subscription January 2026",
    issued: new Date(2026, 0, 15),
    dueDate: new Date(2026, 0, 30),
    notes: null,
    lineItems: [
      { id: "li_2a", productName: "Pro Plan", qty: 1, unitPrice: 150, amount: 150 },
    ],
    subtotal: 150,
    discountPercent: 0,
    discountAmount: 0,
    total: 150,
    amountDue: 150,
    termsAndConditions: "Payment is due by the due date. Late payments may incur a fee.",
    notesContent: "",
    log: [
      { id: "log_2a", description: "Invoice was sent to pixelhubster@gmail.com", date: new Date(2026, 0, 16, 9, 0) },
      { id: "log_2b", description: "Invoice was created", date: new Date(2026, 0, 15, 14, 0) },
    ],
  };
  const inv3: Invoice = {
    id: "inv_3",
    invoiceNumber: "INV4257-09-013",
    status: "Overdue",
    amount: 75,
    currency: DEFAULT_CURRENCY,
    currencyLabel: "USD - US Dollar",
    paidAt: null,
    batchTitle: "Payment batch January 2026",
    billedTo: "billing@company.com",
    billingDetails: "Acme Corp",
    subject: "Consulting services",
    issued: new Date(2026, 0, 1),
    dueDate: new Date(2026, 0, 15),
    notes: null,
    lineItems: [
      { id: "li_3a", productName: "Consulting (10 hrs)", qty: 1, unitPrice: 75, amount: 75 },
    ],
    subtotal: 75,
    discountPercent: 0,
    discountAmount: 0,
    total: 75,
    amountDue: 75,
    termsAndConditions: "Net 30. Please pay by due date.",
    notesContent: "",
    log: [
      { id: "log_3a", description: "Invoice was sent to billing@company.com", date: new Date(2026, 0, 2, 11, 0) },
      { id: "log_3b", description: "Invoice was created", date: new Date(2026, 0, 1, 9, 0) },
    ],
  };
  invoiceStore.set(inv1.id, inv1);
  invoiceStore.set(inv2.id, inv2);
  invoiceStore.set(inv3.id, inv3);
}

/** List invoices (from store). */
export function getInvoiceList(): InvoiceListItem[] {
  seedStore();
  return Array.from(invoiceStore.values()).map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    amount: inv.amount,
    currency: inv.currency,
    customer: inv.billedTo,
    issued: inv.issued,
    dueDate: inv.dueDate,
    paidAt: inv.paidAt,
  }));
}

/** Get full invoice by id. */
export function getInvoiceById(id: string): Invoice | null {
  seedStore();
  return invoiceStore.get(id) ?? null;
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

/** Update invoice (store). Returns updated invoice or null. */
export function updateInvoiceInStore(
  id: string,
  payload: InvoiceUpdatePayload
): Invoice | null {
  seedStore();
  const inv = invoiceStore.get(id);
  if (!inv) return null;
  if (payload.subject != null) inv.subject = payload.subject;
  if (payload.dueDate != null) inv.dueDate = new Date(payload.dueDate);
  if (payload.notes != null) inv.notes = payload.notes;
  if (payload.notesContent != null) inv.notesContent = payload.notesContent;
  if (payload.billedTo != null) inv.billedTo = payload.billedTo;
  if (payload.billingDetails != null) inv.billingDetails = payload.billingDetails;
  if (payload.termsAndConditions != null) inv.termsAndConditions = payload.termsAndConditions;
  if (payload.lineItems != null) {
    inv.lineItems = payload.lineItems;
    inv.subtotal = payload.lineItems.reduce((s, i) => s + i.amount, 0);
    inv.discountAmount = (inv.subtotal * inv.discountPercent) / 100;
    inv.total = inv.subtotal - inv.discountAmount;
    inv.amountDue = inv.total;
    inv.amount = inv.total;
  }
  invoiceStore.set(id, inv);
  return inv;
}

/** Add log entry and optionally update status. */
export function appendInvoiceLog(
  id: string,
  description: string,
  opts?: { status?: InvoiceStatus; paidAt?: Date | null }
): Invoice | null {
  seedStore();
  const inv = invoiceStore.get(id);
  if (!inv) return null;
  const entry: InvoiceLogEntry = {
    id: `log_${Date.now()}`,
    description,
    date: new Date(),
  };
  inv.log.push(entry);
  if (opts?.status != null) inv.status = opts.status;
  if (opts?.paidAt !== undefined) inv.paidAt = opts.paidAt;
  invoiceStore.set(id, inv);
  return inv;
}

/** Mark invoice as paid. */
export function markInvoicePaidInStore(id: string): Invoice | null {
  return appendInvoiceLog(id, "Invoice was marked as paid.", {
    status: "Paid",
    paidAt: new Date(),
  });
}

/** Cancel invoice. */
export function cancelInvoiceInStore(id: string): Invoice | null {
  seedStore();
  const inv = invoiceStore.get(id);
  if (!inv) return null;
  inv.status = "Cancelled";
  inv.log.push({
    id: `log_${Date.now()}`,
    description: "Invoice was cancelled.",
    date: new Date(),
  });
  invoiceStore.set(id, inv);
  return inv;
}

/** Duplicate invoice; returns new invoice id. */
export function duplicateInvoiceInStore(id: string): string | null {
  seedStore();
  const inv = invoiceStore.get(id);
  if (!inv) return null;
  const newId = nextId("inv_");
  const newNumber = nextInvoiceNumber();
  const copy: Invoice = {
    ...inv,
    id: newId,
    invoiceNumber: newNumber,
    status: "Draft",
    paidAt: null,
    issued: new Date(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    log: [
      {
        id: `log_${Date.now()}`,
        description: "Invoice was created (duplicate).",
        date: new Date(),
      },
    ],
    lineItems: inv.lineItems.map((li) => ({
      ...li,
      id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    })),
  };
  invoiceStore.set(newId, copy);
  return newId;
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

export { formatCurrency as formatInvoiceCurrency };
