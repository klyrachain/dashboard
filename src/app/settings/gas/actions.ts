"use server";

import { revalidatePath } from "next/cache";
import { creditBusinessGas, patchPlatformGasSettings } from "@/lib/data-gas";

export type GasActionResult = { ok: true } | { ok: false; error: string };

export async function savePlatformGasAction(body: {
  sponsorshipEnabled?: boolean;
  maxUsdPerTx?: number | null;
  notes?: string | null;
}): Promise<GasActionResult> {
  const r = await patchPlatformGasSettings(body);
  if (r.ok) {
    revalidatePath("/settings/gas");
    return { ok: true };
  }
  return { ok: false, error: r.error };
}

export async function creditBusinessGasAction(body: {
  businessId: string;
  amountUsd: number;
  idempotencyKey: string;
  reason?: "TOPUP" | "ADJUSTMENT" | "REFUND";
}): Promise<GasActionResult> {
  const r = await creditBusinessGas(body);
  if (r.ok) {
    revalidatePath("/settings/gas");
    return { ok: true };
  }
  return { ok: false, error: r.error };
}
