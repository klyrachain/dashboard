/**
 * Users data — Core API only (GET /api/users).
 * No database fallback. Returns [] if Core is unavailable.
 */
import { getSessionToken } from "@/lib/auth";
import { getCoreUsers } from "@/lib/core-api";

export type UserRow = {
  id: string;
  email: string | null;
  address: string | null;
  createdAt: Date;
};

/** Single transaction as returned with a user (list/detail). */
export type UserTransactionRow = {
  id: string;
  type: string;
  status: string;
  fromAmount: string;
  toAmount: string;
  /** Fee in token units (legacy). Prefer feeInUsd for USD display. */
  fee: string | null;
  /** Fee value in USD (set when status = COMPLETED). */
  feeInUsd: string | null;
  createdAt: Date;
};

export type UserWithTransactions = UserRow & {
  transactions: UserTransactionRow[];
};

/** Normalize Core API user item to UserWithTransactions. */
function coreUserToRow(item: unknown): UserWithTransactions | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const email = o.email != null ? String(o.email) : null;
  const address = o.address != null ? String(o.address) : null;
  const createdAt = o.createdAt instanceof Date ? o.createdAt : new Date(String(o.createdAt ?? ""));
  function feeVal(v: unknown): string | null {
    if (v == null || v === "") return null;
    const s = String(v).trim();
    return s || null;
  }
  const rawTx = Array.isArray(o.transactions) ? o.transactions : [];
  const transactions: UserTransactionRow[] = rawTx
    .map((t: unknown) => {
      if (!t || typeof t !== "object") return null;
      const tx = t as Record<string, unknown>;
      return {
        id: String(tx.id ?? ""),
        type: String(tx.type ?? ""),
        status: String(tx.status ?? ""),
        fromAmount: String(tx.fromAmount ?? tx.f_amount ?? ""),
        toAmount: String(tx.toAmount ?? tx.t_amount ?? ""),
        fee: feeVal(tx.fee),
        feeInUsd: tx.feeInUsd != null ? String(tx.feeInUsd).trim() || null : null,
        createdAt: tx.createdAt instanceof Date ? tx.createdAt : new Date(String(tx.createdAt ?? "")),
      };
    })
    .filter((r): r is UserTransactionRow => r !== null);
  return { id, email, address, createdAt, transactions };
}

/** Fetches users from Core API only. Returns [] if Core is unavailable or returns no data. */
export async function getUsers(): Promise<UserWithTransactions[]> {
  try {
    const token = await getSessionToken();
    const result = await getCoreUsers({ limit: 100 }, token ?? undefined);
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    return raw.map((item) => coreUserToRow(item)).filter((r): r is UserWithTransactions => r !== null);
  } catch {
    // Core unavailable
  }
  return [];
}
