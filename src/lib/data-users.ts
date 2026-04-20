/**
 * Users data — Core API only (GET /api/users).
 * No database fallback. Returns [] if Core is unavailable.
 */
import { getSessionToken } from "@/lib/auth";
import { getCoreUsers } from "@/lib/core-api";
import { getPeerRampKycUsersForAdmin } from "@/lib/data-peer-ramp-kyc";

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
  /** Morapay portal `User` vs Peer Ramp consumer (no portal row). */
  customerSource?: "portal" | "peer_ramp";
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
  return { id, email, address, createdAt, transactions, customerSource: "portal" };
}

/** Fetches users from Core API only. Returns [] if Core is unavailable or returns no data. */
export async function getUsers(options?: { limit?: number }): Promise<UserWithTransactions[]> {
  try {
    const token = await getSessionToken();
    const limit = Math.min(500, Math.max(1, options?.limit ?? 100));
    const result = await getCoreUsers({ limit }, token ?? undefined);
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    return raw.map((item) => coreUserToRow(item)).filter((r): r is UserWithTransactions => r !== null);
  } catch {
    // Core unavailable
  }
  return [];
}

/**
 * Platform admin: Morapay portal users plus Peer Ramp consumers that are not already a portal row (matched by email).
 */
export async function getAllPlatformCustomers(): Promise<UserWithTransactions[]> {
  const [portalUsers, kycRes] = await Promise.all([
    getUsers({ limit: 500 }),
    getPeerRampKycUsersForAdmin(undefined, 500),
  ]);
  const kycRows = kycRes.ok ? kycRes.users : [];
  const seenEmails = new Set(
    portalUsers.map((u) => u.email?.trim().toLowerCase()).filter((e): e is string => Boolean(e))
  );
  const merged: UserWithTransactions[] = [...portalUsers];
  for (const row of kycRows) {
    if (row.source !== "peer_ramp") continue;
    const e = row.email.trim().toLowerCase();
    if (!e || seenEmails.has(e)) continue;
    seenEmails.add(e);
    merged.push({
      id: `peer-ramp:${e}`,
      email: row.email,
      address: null,
      createdAt: row.profileCompletedAt
        ? new Date(row.profileCompletedAt)
        : new Date(row.updatedAt),
      transactions: [],
      customerSource: "peer_ramp",
    });
  }
  return merged;
}
