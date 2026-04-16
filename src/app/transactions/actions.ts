"use server";

import { revalidatePath } from "next/cache";
import { getTransactions } from "@/lib/data-transactions";
import type { TransactionRow } from "@/lib/data-transactions";

export async function retryTransaction(transactionId: string) {
  // Stubbed: in production call transaction-engine or update DB
  await new Promise((r) => setTimeout(r, 300));
  revalidatePath("/transactions");
  return { success: true, message: "Retry requested" };
}

/** Refetch transactions from Core; returns fresh list for client to update table without full page reload. */
export async function refreshTransactionsAction(): Promise<TransactionRow[]> {
  return getTransactions();
}
