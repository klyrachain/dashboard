"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PLATFORM_PRIMARY_HEX } from "@/lib/platform-theme";
import { createInvoiceAction, updateInvoiceAction } from "@/app/invoices/actions";
import {
  createInvoiceViaMerchantProxy,
  hasMerchantInvoicesAuth,
  updateInvoiceViaMerchantProxy,
} from "@/lib/merchant-invoices-proxy-client";
import type { CreateCoreInvoiceBody } from "@/lib/core-api";
import type { InvoiceUpdatePayload, SerializedInvoice } from "@/lib/data-invoices";
import { SupportedNetworksCarousel } from "@/components/merchant/supported-networks-carousel";

/** Matches merchant dashboard controls (`merchant-payment-links-client`). */
const FILTER_CONTROL_CLASS = "bg-muted/30";

/** Draft row aligned with Core line items (`productName`, `qty`, `unitPrice`). */
export type DraftInvoiceLineItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

function newLineItem(): DraftInvoiceLineItem {
  return {
    id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Math.random()),
    name: "",
    quantity: 1,
    price: 0,
  };
}

export type CreateInvoicePageClientProps = {
  /** When set with `initialInvoice`, the form PATCHes this invoice instead of creating. */
  editInvoiceId?: string;
  initialInvoice?: SerializedInvoice;
};

function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lineItemsFromSerialized(inv: SerializedInvoice): DraftInvoiceLineItem[] {
  if (!inv.lineItems.length) return [newLineItem()];
  return inv.lineItems.map((li) => ({
    id: li.id,
    name: li.productName,
    quantity: Math.max(1, li.qty),
    price: Math.max(0, li.unitPrice),
  }));
}

function toIsoEndOfDay(dateYmd: string): string {
  if (!dateYmd.trim()) return new Date().toISOString();
  const d = new Date(`${dateYmd}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Server actions that call `redirect()` throw this digest; treat as success on the client. */
function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

type InvoiceValidationField = "billedTo" | "dueDate" | "lineItems";

const FIELD_ERROR_RING =
  "ring-2 ring-destructive/60 border-destructive focus-visible:ring-destructive/60";

function validateInvoiceForm(
  billedTo: string,
  dueDate: string,
  normalizedLineCount: number
): { field: InvoiceValidationField; message: string } | null {
  if (!billedTo.trim()) {
    return {
      field: "billedTo",
      message: "Add who this is billed to (email or name).",
    };
  }
  if (!dueDate.trim()) {
    return { field: "dueDate", message: "Choose a due date." };
  }
  if (normalizedLineCount === 0) {
    return {
      field: "lineItems",
      message: "Add at least one line item with a description.",
    };
  }
  return null;
}

export function CreateInvoicePageClient({
  editInvoiceId,
  initialInvoice,
}: CreateInvoicePageClientProps = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isEdit = Boolean(editInvoiceId && initialInvoice);

  const [billedTo, setBilledTo] = useState(() => initialInvoice?.billedTo ?? "");
  const [billingDetails, setBillingDetails] = useState(
    () => initialInvoice?.billingDetails ?? ""
  );
  const [subject, setSubject] = useState(() => initialInvoice?.subject ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => initialInvoice?.invoiceNumber ?? "INV0001"
  );

  const [issued, setIssued] = useState(() =>
    initialInvoice?.issued ? isoToDateInput(initialInvoice.issued) : ""
  );
  const [dueDate, setDueDate] = useState(() =>
    initialInvoice?.dueDate ? isoToDateInput(initialInvoice.dueDate) : ""
  );

  const [currency, setCurrency] = useState(() => initialInvoice?.currency ?? "USD");
  const [discountPercent, setDiscountPercent] = useState(() =>
    Math.min(100, Math.max(0, initialInvoice?.discountPercent ?? 0))
  );

  const [lineItems, setLineItems] = useState<DraftInvoiceLineItem[]>(() =>
    initialInvoice ? lineItemsFromSerialized(initialInvoice) : [newLineItem()]
  );

  const [notes, setNotes] = useState(() => initialInvoice?.notesContent ?? "");
  const [termsAndConditions, setTermsAndConditions] = useState(
    () => initialInvoice?.termsAndConditions ?? ""
  );

  /** Client-side validation: highlight the matching control. */
  const [fieldError, setFieldError] = useState<{
    field: InvoiceValidationField;
    message: string;
  } | null>(null);
  /** API / server action failures (not tied to a single field). */
  const [serverError, setServerError] = useState<string | null>(null);

  const subtotal = useMemo(
    () => lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0),
    [lineItems]
  );

  const discountAmount = useMemo(
    () => subtotal * (Math.min(100, Math.max(0, discountPercent)) / 100),
    [subtotal, discountPercent]
  );

  const total = Math.max(0, subtotal - discountAmount);

  const addLineItem = () => {
    if (fieldError?.field === "lineItems") setFieldError(null);
    setLineItems((prev) => [...prev, newLineItem()]);
  };

  const removeLineItem = (id: string) => {
    if (fieldError?.field === "lineItems") setFieldError(null);
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const updateLineItem = (
    id: string,
    field: keyof Pick<DraftInvoiceLineItem, "name" | "quantity" | "price">,
    value: string | number
  ) => {
    if (fieldError?.field === "lineItems") setFieldError(null);
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "name") return { ...item, name: String(value) };
        if (field === "quantity") {
          const q = typeof value === "number" ? value : parseInt(String(value), 10);
          return { ...item, quantity: Number.isFinite(q) ? Math.max(1, q) : 1 };
        }
        const p = typeof value === "number" ? value : parseFloat(String(value));
        return { ...item, price: Number.isFinite(p) ? Math.max(0, p) : 0 };
      })
    );
  };

  const normalizedLineItems = useMemo(() => {
    return lineItems
      .filter((li) => li.name.trim().length > 0)
      .map((li) => ({
        productName: li.name.trim(),
        qty: Math.max(1, Math.floor(li.quantity)),
        unitPrice: Math.max(0, li.price),
        amount: Math.max(0, li.quantity) * Math.max(0, li.price),
      }));
  }, [lineItems]);

  const normalizedLineItemsForPatch = useMemo(() => {
    return lineItems
      .filter((li) => li.name.trim().length > 0)
      .map((li) => ({
        id: li.id,
        productName: li.name.trim(),
        qty: Math.max(1, Math.floor(li.quantity)),
        unitPrice: Math.max(0, li.price),
        amount: Math.max(0, li.quantity) * Math.max(0, li.price),
      }));
  }, [lineItems]);

  const buildUpdatePayload = (): InvoiceUpdatePayload => {
    const due = dueDate.trim() ? toIsoEndOfDay(dueDate) : toIsoEndOfDay("");
    const disc = Math.min(100, Math.max(0, discountPercent));
    return {
      subject: subject.trim() || "Invoice",
      dueDate: due,
      billedTo: billedTo.trim(),
      billingDetails: billingDetails.trim(),
      termsAndConditions: termsAndConditions.trim(),
      notesContent: notes.trim(),
      discountPercent: disc,
      lineItems: normalizedLineItemsForPatch,
    };
  };

  const buildBody = (sendNow: boolean): CreateCoreInvoiceBody => {
    const due = dueDate.trim() ? toIsoEndOfDay(dueDate) : toIsoEndOfDay("");
    const disc = Math.min(100, Math.max(0, discountPercent));
    return {
      billedTo: billedTo.trim(),
      subject: subject.trim() || "Invoice",
      dueDate: due,
      lineItems: normalizedLineItems,
      ...(billingDetails.trim() ? { billingDetails: billingDetails.trim() } : {}),
      ...(disc > 0 ? { discountPercent: disc } : {}),
      ...(termsAndConditions.trim()
        ? { termsAndConditions: termsAndConditions.trim() }
        : {}),
      ...(notes.trim() ? { notesContent: notes.trim() } : {}),
      ...(sendNow ? { sendNow: true as const } : {}),
    };
  };

  const submit = (sendNow: boolean) => {
    setServerError(null);
    const v = validateInvoiceForm(billedTo, dueDate, normalizedLineItems.length);
    if (v) {
      setFieldError(v);
      queueMicrotask(() => {
        const id =
          v.field === "billedTo"
            ? "invoice-field-billed-to"
            : v.field === "dueDate"
              ? "invoice-field-due-date"
              : "invoice-field-line-items";
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setFieldError(null);
    const body = buildBody(sendNow);

    startTransition(async () => {
      if (hasMerchantInvoicesAuth()) {
        const created = await createInvoiceViaMerchantProxy(body);
        if (created.success) {
          router.push(`/invoices/${created.id}`);
          router.refresh();
        } else {
          setServerError(created.error ?? "Could not create invoice.");
        }
        return;
      }
      try {
        const result = await createInvoiceAction(body);
        if (!result.success) {
          setServerError(result.error ?? "Could not create invoice.");
        }
      } catch (e) {
        if (isNextRedirect(e)) return;
        setServerError("Could not create invoice.");
      }
    });
  };

  const saveEdit = () => {
    if (!isEdit || !editInvoiceId) return;
    setServerError(null);
    const v = validateInvoiceForm(billedTo, dueDate, normalizedLineItems.length);
    if (v) {
      setFieldError(v);
      queueMicrotask(() => {
        const elId =
          v.field === "billedTo"
            ? "invoice-field-billed-to"
            : v.field === "dueDate"
              ? "invoice-field-due-date"
              : "invoice-field-line-items";
        document.getElementById(elId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setFieldError(null);
    const payload = buildUpdatePayload();

    startTransition(async () => {
      if (hasMerchantInvoicesAuth()) {
        const result = await updateInvoiceViaMerchantProxy(editInvoiceId, payload);
        if (result.success) {
          router.push(`/invoices/${editInvoiceId}`);
          router.refresh();
        } else {
          setServerError(result.error ?? "Could not update invoice.");
        }
        return;
      }
      const result = await updateInvoiceAction(editInvoiceId, payload);
      if (result.success) {
        router.push(`/invoices/${editInvoiceId}`);
        router.refresh();
      } else {
        setServerError(result.error ?? "Could not update invoice.");
      }
    });
  };

  const backHref = isEdit && editInvoiceId ? `/invoices/${editInvoiceId}` : "/invoices";
  const backLabel = isEdit ? "Back to invoice" : "Back to invoices";

  return (
    <div className="min-h-screen w-full p-4 font-primary text-body md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="shrink-0" asChild>
              <Link href={backHref} aria-label={backLabel}>
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div className="min-w-0 space-y-1">
              <h1 className="text-display font-semibold tracking-tight">
                {isEdit ? "Edit invoice" : "Create new invoice"}
              </h1>
              <p className="font-secondary text-caption text-muted-foreground max-w-prose">
                {isEdit ? "Updating " : "Drafting "}
                {invoiceNumber}
                {issued ? ` · Issued ${issued}` : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isEdit ? (
              <Button
                type="button"
                className="gap-2 px-6 text-white hover:opacity-90"
                style={{ backgroundColor: PLATFORM_PRIMARY_HEX }}
                disabled={pending}
                onClick={() => saveEdit()}
              >
                {pending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="mr-2 size-4" aria-hidden />
                )}
                Save changes
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={`gap-2 px-6 ${FILTER_CONTROL_CLASS}`}
                  disabled={pending}
                  onClick={() => submit(false)}
                >
                  {pending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="mr-2 size-4" aria-hidden />
                  )}
                  Save draft
                </Button>
                <Button
                  type="button"
                  className="gap-2 px-6 text-white hover:opacity-90"
                  style={{ backgroundColor: PLATFORM_PRIMARY_HEX }}
                  disabled={pending}
                  onClick={() => submit(true)}
                >
                  {pending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="mr-2 size-4" aria-hidden />
                  )}
                  Issue invoice
                </Button>
              </>
            )}
          </div>
        </header>

        {serverError ? (
          <div
            className="rounded-md border border-destructive/40 bg-destructive/5 p-4 font-secondary text-caption text-destructive"
            role="alert"
          >
            {serverError}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div
            className={cn(
              "flex flex-col gap-8 rounded-lg border border-border bg-card p-6",
              "sm:p-10 lg:p-12"
            )}
          >
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1.5" id="invoice-field-billed-to">
                  <Label className="font-secondary text-caption text-muted-foreground">
                    Billed to
                  </Label>
                  <Input
                    placeholder="Customer email or name"
                    value={billedTo}
                    onChange={(e) => {
                      setBilledTo(e.target.value);
                      if (fieldError?.field === "billedTo") setFieldError(null);
                    }}
                    aria-invalid={fieldError?.field === "billedTo"}
                    aria-describedby={
                      fieldError?.field === "billedTo" ? "invoice-error-billed-to" : undefined
                    }
                    className={cn(
                      FILTER_CONTROL_CLASS,
                      fieldError?.field === "billedTo" && FIELD_ERROR_RING
                    )}
                  />
                  {fieldError?.field === "billedTo" ? (
                    <p
                      id="invoice-error-billed-to"
                      className="font-secondary text-caption text-destructive"
                      role="alert"
                    >
                      {fieldError.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label className="font-secondary text-caption text-muted-foreground">
                    Billing address
                  </Label>
                  <Textarea
                    placeholder="Street, City, Country"
                    value={billingDetails}
                    onChange={(e) => setBillingDetails(e.target.value)}
                    className={cn("min-h-[80px] resize-none", FILTER_CONTROL_CLASS)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-secondary text-caption text-muted-foreground">Subject</Label>
                <Textarea
                  placeholder="e.g. Design services for Q3"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={cn("min-h-[148px] resize-none text-base", FILTER_CONTROL_CLASS)}
                />
              </div>
            </div>

            <div className="mt-2" id="invoice-field-line-items">
              <div className="mb-3 hidden grid-cols-[1fr_5rem_6rem_6rem_2.5rem] gap-3 px-1 font-tertiary text-table font-medium uppercase tracking-wider text-muted-foreground md:grid lg:grid-cols-[1fr_100px_140px_140px_40px] lg:gap-4">
                <div>Description</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Price</div>
                <div className="text-right">Amount</div>
                <div />
              </div>

              <div
                className={cn(
                  "flex flex-col gap-4 rounded-lg p-1",
                  fieldError?.field === "lineItems" && "ring-2 ring-destructive/60"
                )}
              >
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-lg border border-border bg-muted/30 p-4 md:border-0 md:bg-transparent md:p-0"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_5rem_6rem_6rem_2.5rem] md:items-center lg:grid-cols-[1fr_100px_140px_140px_40px] lg:gap-4">
                      <div className="space-y-1 md:col-span-1">
                        <Label className="font-secondary text-caption text-muted-foreground md:hidden">
                          Description
                        </Label>
                        <Input
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateLineItem(item.id, "name", e.target.value)}
                          className={FILTER_CONTROL_CLASS}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-secondary text-caption text-muted-foreground md:hidden">
                          Qty
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(item.id, "quantity", Number(e.target.value))
                          }
                          className={cn(FILTER_CONTROL_CLASS, "text-right tabular-nums")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-secondary text-caption text-muted-foreground md:hidden">
                          Price
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.price}
                          onChange={(e) =>
                            updateLineItem(item.id, "price", Number(e.target.value))
                          }
                          className={cn(FILTER_CONTROL_CLASS, "text-right tabular-nums")}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 md:justify-end">
                        <span className="font-secondary text-caption text-muted-foreground md:hidden">
                          Amount
                        </span>
                        <span className="text-right font-medium tabular-nums font-tertiary text-table">
                          {currency}{" "}
                          {(item.quantity * item.price).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-end md:justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length <= 1}
                          className="text-muted-foreground opacity-100 hover:text-destructive md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                          aria-label="Remove line"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className={cn("mt-2 gap-2", FILTER_CONTROL_CLASS)}
              >
                <Plus className="size-4" aria-hidden />
                Add line item
              </Button>
              {fieldError?.field === "lineItems" ? (
                <p
                  id="invoice-error-line-items"
                  className="mt-2 font-secondary text-caption text-destructive"
                  role="alert"
                >
                  {fieldError.message}
                </p>
              ) : null}
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-3">
                  <div className="flex justify-between font-secondary text-caption text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-tertiary text-table text-foreground">
                      {currency}{" "}
                      {subtotal.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {discountPercent > 0 ? (
                    <div className="flex justify-between font-secondary text-caption text-emerald-700 dark:text-emerald-400">
                      <span>Discount ({discountPercent}%)</span>
                      <span className="tabular-nums font-tertiary text-table">
                        −{currency}{" "}
                        {discountAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex min-w-0 flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1 space-y-2 sm:max-w-xl">
                  <p className="font-secondary text-caption text-muted-foreground leading-snug">
                    Your invoice can be paid on any supported network using compatible tokens.
                  </p>
                  <SupportedNetworksCarousel
                    enabled
                    itemPx={44}
                    gapPx={12}
                    iconSize={30}
                    showCenterFrame={false}
                    showEdgeGradient
                    className="max-w-lg"
                  />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-right sm:min-w-[9rem]">
                  <span className="text-heading font-semibold tracking-tight text-foreground">
                    Amount due
                  </span>
                  <span className="tabular-nums font-tertiary text-heading font-semibold text-foreground">
                    {currency}{" "}
                    {total.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* <div className="mt-4 flex justify-end">
                <p className="w-full max-w-xs font-secondary text-caption text-muted-foreground">
                  Display currency is for your workspace; the invoice is stored in the amounts
                  above. Core may record settlement currency separately.
                </p>
              </div> */}
            </div>

            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-secondary text-caption text-muted-foreground">
                  Notes to customer
                </Label>
                <Textarea
                  placeholder="Thank you for your business."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={cn("min-h-[100px] resize-none", FILTER_CONTROL_CLASS)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-secondary text-caption text-muted-foreground">
                  Terms and conditions
                </Label>
                <Textarea
                  placeholder="Payment is due within 15 days."
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className={cn("min-h-[100px] resize-none", FILTER_CONTROL_CLASS)}
                />
              </div>
            </div>
          </div>

          <aside className="flex h-fit flex-col gap-6 rounded-lg border border-border bg-card p-6">
            <div className="space-y-1.5">
              <Label htmlFor="inv-number" className="font-secondary text-caption">
                Invoice number
              </Label>
              <Input
                id="inv-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={cn("font-mono", FILTER_CONTROL_CLASS)}
              />
              <p className="font-secondary text-caption text-muted-foreground">
                For your records; issuance numbering may still follow your our rules.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="font-secondary text-caption">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className={FILTER_CONTROL_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="GHS">GHS</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="USDC">USDC (crypto)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-issued" className="font-secondary text-caption">
                Issue date
              </Label>
              <Input
                id="inv-issued"
                type="date"
                value={issued}
                onChange={(e) => setIssued(e.target.value)}
                className={cn("text-muted-foreground", FILTER_CONTROL_CLASS)}
              />
            </div>

            <div className="space-y-1.5" id="invoice-field-due-date">
              <Label htmlFor="inv-due" className="font-secondary text-caption">
                Due date
              </Label>
              <Input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (fieldError?.field === "dueDate") setFieldError(null);
                }}
                aria-invalid={fieldError?.field === "dueDate"}
                aria-describedby={
                  fieldError?.field === "dueDate" ? "invoice-error-due-date" : undefined
                }
                className={cn(
                  "text-muted-foreground",
                  FILTER_CONTROL_CLASS,
                  fieldError?.field === "dueDate" && FIELD_ERROR_RING
                )}
              />
              {fieldError?.field === "dueDate" ? (
                <p
                  id="invoice-error-due-date"
                  className="font-secondary text-caption text-destructive"
                  role="alert"
                >
                  {fieldError.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5 border-t border-border pt-6">
              <Label htmlFor="inv-discount" className="font-secondary text-caption">
                Apply discount (%)
              </Label>
              <Input
                id="inv-discount"
                type="number"
                min={0}
                max={100}
                value={discountPercent || ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setDiscountPercent(Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0);
                }}
                className={FILTER_CONTROL_CLASS}
              />
              <p className="mt-1 font-secondary text-caption text-muted-foreground">
                Discount is applied to the subtotal before the amount due.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
