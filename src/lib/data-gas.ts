/**
 * Platform gas sponsorship — GET/PATCH via Core /api/platform/gas/*.
 */

import { getSessionToken } from "@/lib/auth";
import {
  getCorePlatformGasBusinesses,
  getCorePlatformGasLedger,
  getCorePlatformGasSettings,
  patchCorePlatformGasSettings,
  postCorePlatformGasCredit,
} from "@/lib/core-api";

export type PlatformGasSettings = {
  sponsorshipEnabled: boolean;
  maxUsdPerTx: string | null;
  notes: string | null;
};

export type PlatformGasBusinessRow = {
  businessId: string;
  businessName: string;
  slug: string;
  prepaidBalanceUsd: string;
  sponsorshipEnabled: boolean;
  lowBalanceWarnUsd: string | null;
  updatedAt: string;
};

export type PlatformGasLedgerRow = {
  id: string;
  createdAt: string;
  businessId: string | null;
  businessName: string | null;
  slug: string | null;
  direction: string;
  amountUsd: string;
  reason: string;
  idempotencyKey: string;
  metadata: unknown;
};

export async function getPlatformGasSettings() {
  const token = await getSessionToken();
  if (!token) return { ok: false as const, error: "Not signed in" };
  const res = await getCorePlatformGasSettings(token);
  const body = res.data as {
    success?: boolean;
    data?: PlatformGasSettings;
    error?: string;
  };
  if (!res.ok || body.success === false) {
    return { ok: false as const, error: body.error ?? "Failed to load gas settings." };
  }
  return { ok: true as const, data: body.data ?? null };
}

export async function getPlatformGasBusinessesPage(page = 1, limit = 20) {
  const token = await getSessionToken();
  if (!token) return { ok: false as const, error: "Not signed in" };
  const res = await getCorePlatformGasBusinesses({ page, limit }, token);
  const body = res.data as {
    success?: boolean;
    data?: PlatformGasBusinessRow[];
    meta?: { page: number; limit: number; total: number };
    error?: string;
  };
  if (!res.ok || body.success === false) {
    return { ok: false as const, error: body.error ?? "Failed to load businesses." };
  }
  return {
    ok: true as const,
    rows: body.data ?? [],
    meta: body.meta ?? { page, limit, total: 0 },
  };
}

export async function getPlatformGasLedgerPage(page = 1, limit = 25, reason?: string) {
  const token = await getSessionToken();
  if (!token) return { ok: false as const, error: "Not signed in" };
  const res = await getCorePlatformGasLedger(
    { page, limit, ...(reason?.trim() ? { reason: reason.trim() } : {}) },
    token
  );
  const body = res.data as {
    success?: boolean;
    data?: PlatformGasLedgerRow[];
    meta?: { page: number; limit: number; total: number };
    error?: string;
  };
  if (!res.ok || body.success === false) {
    return { ok: false as const, error: body.error ?? "Failed to load gas ledger." };
  }
  return {
    ok: true as const,
    rows: body.data ?? [],
    meta: body.meta ?? { page, limit, total: 0 },
  };
}

export async function patchPlatformGasSettings(body: {
  sponsorshipEnabled?: boolean;
  maxUsdPerTx?: number | null;
  notes?: string | null;
}) {
  const token = await getSessionToken();
  if (!token) return { ok: false as const, error: "Not signed in" };
  const res = await patchCorePlatformGasSettings(body, token);
  if (!res.ok) return { ok: false as const, error: "Request failed." };
  const out = res.data as { success?: boolean; data?: PlatformGasSettings; error?: string };
  if (out.success === false) {
    return { ok: false as const, error: out.error ?? "Update failed." };
  }
  return { ok: true as const, data: out.data ?? null };
}

export async function creditBusinessGas(body: {
  businessId: string;
  amountUsd: number;
  idempotencyKey: string;
  reason?: "TOPUP" | "ADJUSTMENT" | "REFUND";
}) {
  const token = await getSessionToken();
  if (!token) return { ok: false as const, error: "Not signed in" };
  const res = await postCorePlatformGasCredit(body, token);
  if (!res.ok) return { ok: false as const, error: "Request failed." };
  const out = res.data as { success?: boolean; data?: unknown; error?: string };
  if (out.success === false) {
    return { ok: false as const, error: out.error ?? "Credit failed." };
  }
  return { ok: true as const, data: out.data };
}
