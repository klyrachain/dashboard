"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getInvoiceById,
  updateInvoiceInStore,
  appendInvoiceLog,
  markInvoicePaidInStore,
  cancelInvoiceInStore,
  duplicateInvoiceInStore,
  type InvoiceUpdatePayload,
} from "@/lib/data-invoices";

export type InvoiceActionResult = { success: boolean; error?: string };

export async function sendInvoiceAction(
  id: string,
  recipientEmail?: string
): Promise<InvoiceActionResult> {
  const inv = getInvoiceById(id);
  if (!inv) return { success: false, error: "Invoice not found" };
  const email = recipientEmail ?? inv.billedTo;
  appendInvoiceLog(id, `Invoice was sent to ${email}`);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { success: true };
}

export async function updateInvoiceAction(
  id: string,
  payload: InvoiceUpdatePayload
): Promise<InvoiceActionResult> {
  const updated = updateInvoiceInStore(id, payload);
  if (!updated) return { success: false, error: "Invoice not found" };
  appendInvoiceLog(id, "Invoice was updated.");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { success: true };
}

export async function updateInvoiceNotesAction(
  id: string,
  notesContent: string
): Promise<InvoiceActionResult> {
  return updateInvoiceAction(id, { notesContent });
}

export async function markInvoicePaidAction(id: string): Promise<InvoiceActionResult> {
  const updated = markInvoicePaidInStore(id);
  if (!updated) return { success: false, error: "Invoice not found" };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { success: true };
}

export async function cancelInvoiceAction(id: string): Promise<InvoiceActionResult> {
  const updated = cancelInvoiceInStore(id);
  if (!updated) return { success: false, error: "Invoice not found" };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return { success: true };
}

export async function duplicateInvoiceAction(id: string): Promise<InvoiceActionResult & { newId?: string }> {
  const newId = duplicateInvoiceInStore(id);
  if (!newId) return { success: false, error: "Invoice not found" };
  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}
