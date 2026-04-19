"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionToken } from "@/lib/auth";
import {
  createCoreInvoice,
  sendCoreInvoice,
  updateCoreInvoice,
  markCoreInvoicePaid,
  cancelCoreInvoice,
  duplicateCoreInvoice,
} from "@/lib/core-api";
import type { CreateCoreInvoiceBody } from "@/lib/core-api";
import {
  buildInvoiceUpdatePatchBody,
  type InvoiceUpdatePayload,
} from "@/lib/data-invoices";

export type InvoiceActionResult = { success: boolean; error?: string };

export async function createInvoiceAction(
  body: CreateCoreInvoiceBody
): Promise<InvoiceActionResult & { newId?: string }> {
  if (!body.lineItems?.length) {
    return { success: false, error: "At least one line item is required." };
  }
  const token = await getSessionToken();
  if (!token?.trim()) {
    return { success: false, error: "You must be signed in to manage business invoices." };
  }
  const { ok, status, data } = await createCoreInvoice(body, token ?? undefined);
  if (!ok || !data || typeof data !== "object") {
    const err =
      status === 404
        ? "Not Found — Core API may not have the invoices endpoint. Check that the Core server implements POST /api/invoices."
        : data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : "Failed to create invoice.";
    return { success: false, error: err };
  }
  const envelope = data as { success?: boolean; data?: { id?: string } };
  const newInvoice = envelope.success ? envelope.data : undefined;
  const newId = newInvoice?.id;
  if (!newId) {
    return { success: false, error: "Invoice was created but no id was returned." };
  }
  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}

export async function sendInvoiceAction(
  id: string,
  recipientEmail?: string
): Promise<InvoiceActionResult> {
  const token = await getSessionToken();
  if (!token?.trim()) {
    return { success: false, error: "You must be signed in to manage business invoices." };
  }
  const { ok, status, data } = await sendCoreInvoice(id, recipientEmail, token ?? undefined);
  if (ok) {
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  }
  const err =
    status === 404
      ? "Not Found — Invoice or Core send endpoint may not exist."
      : data && typeof data === "object" && "error" in data
        ? String((data as { error: string }).error)
        : "Failed to send invoice";
  return { success: false, error: err };
}

export async function updateInvoiceAction(
  id: string,
  payload: InvoiceUpdatePayload
): Promise<InvoiceActionResult> {
  const body = buildInvoiceUpdatePatchBody(payload) as Parameters<
    typeof updateCoreInvoice
  >[1];

  const token = await getSessionToken();
  if (!token?.trim()) {
    return { success: false, error: "You must be signed in to manage business invoices." };
  }
  const { ok, status, data } = await updateCoreInvoice(id, body, token ?? undefined);
  if (ok) {
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  }
  if (status === 409) {
    return { success: false, error: "Invoice cannot be edited (Paid or Cancelled)." };
  }
  const err = data && typeof data === "object" && "error" in data ? String((data as { error: string }).error) : "Failed to update invoice";
  return { success: false, error: err };
}

export async function updateInvoiceNotesAction(
  id: string,
  notesContent: string
): Promise<InvoiceActionResult> {
  return updateInvoiceAction(id, { notesContent });
}

export async function markInvoicePaidAction(id: string): Promise<InvoiceActionResult> {
  const token = await getSessionToken();
  if (!token?.trim()) {
    return { success: false, error: "You must be signed in to manage business invoices." };
  }
  const { ok, data } = await markCoreInvoicePaid(id, token ?? undefined);
  if (ok) {
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  }
  const err = data && typeof data === "object" && "error" in data ? String((data as { error: string }).error) : "Failed to mark as paid";
  return { success: false, error: err };
}

export async function cancelInvoiceAction(id: string): Promise<InvoiceActionResult> {
  const token = await getSessionToken();
  if (!token?.trim()) {
    return { success: false, error: "You must be signed in to manage business invoices." };
  }
  const { ok, data } = await cancelCoreInvoice(id, token ?? undefined);
  if (ok) {
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  }
  const err = data && typeof data === "object" && "error" in data ? String((data as { error: string }).error) : "Failed to cancel invoice";
  return { success: false, error: err };
}

export async function duplicateInvoiceAction(id: string): Promise<InvoiceActionResult & { newId?: string }> {
  const token = await getSessionToken();
  if (!token?.trim()) {
    return { success: false, error: "You must be signed in to manage business invoices." };
  }
  const { ok, status, data } = await duplicateCoreInvoice(id, token ?? undefined);
  if (!ok || !data || typeof data !== "object") {
    const err =
      status === 404
        ? "Not Found — Invoice or Core duplicate endpoint may not exist."
        : data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : "Failed to duplicate invoice";
    return { success: false, error: err };
  }
  const envelope = data as { success?: boolean; data?: { id?: string } };
  const newInvoice = envelope.success ? envelope.data : undefined;
  const newId = newInvoice?.id;
  if (!newId) {
    return { success: false, error: "Duplicate succeeded but new invoice id was not returned." };
  }
  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}
