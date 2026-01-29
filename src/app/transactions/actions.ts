"use server";

import { revalidatePath } from "next/cache";

export async function retryTransaction(transactionId: string) {
  // Stubbed: in production call transaction-engine or update DB
  await new Promise((r) => setTimeout(r, 300));
  revalidatePath("/transactions");
  return { success: true, message: "Retry requested" };
}
