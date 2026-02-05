/**
 * Transactions data — Core API only (GET /api/transactions).
 * No database fallback. Returns [] if Core is unavailable.
 */
import { getSessionToken } from "@/lib/auth";
import { getCoreTransactions } from "@/lib/core-api";

/** Row shape for display; maps all fields returned by Core GET /api/transactions. */
export type TransactionRow = {
  id: string;
  type: string;
  status: string;
  fromAmount: string;
  toAmount: string;
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  /** Effective trade rate: toAmount/fromAmount (to-token per from-token). */
  exchangeRate: string | null;
  /** Price of 1 unit of from token in USD. */
  fTokenPriceUsd: string | null;
  /** Price of 1 unit of to token in USD. */
  tTokenPriceUsd: string | null;
  /** Fee value in USD (set when status = COMPLETED). Use this for fee display. */
  feeInUsd: string | null;
  fromIdentifier: string;
  toIdentifier: string;
  fromType: string;
  toType: string;
  fromUserId: string;
  toUserId: string;
  fromProvider: string;
  toProvider: string;
  requestId: string;
  /** Fee in token units (legacy). Prefer feeInUsd for USD display. */
  fee: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function date(v: unknown): Date {
  if (v instanceof Date) return v;
  const s = String(v ?? "");
  const t = Date.parse(s);
  return Number.isNaN(t) ? new Date(0) : new Date(t);
}

/** Normalize Core API transaction item to TransactionRow (camelCase or snake_case). */
function coreItemToRow(item: unknown): TransactionRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  const feeVal = o.fee;
  const fee =
    feeVal == null || feeVal === ""
      ? null
      : typeof feeVal === "string"
        ? feeVal.trim()
        : String(feeVal).trim();

  return {
    id,
    type: str(o.type),
    status: str(o.status),
    fromAmount: str(o.fromAmount ?? o.f_amount),
    toAmount: str(o.toAmount ?? o.t_amount),
    fromToken: str(o.fromToken ?? o.f_token),
    toToken: str(o.toToken ?? o.t_token),
    fromChain: str(o.fromChain ?? o.f_chain ?? "ETHEREUM"),
    toChain: str(o.toChain ?? o.t_chain ?? "ETHEREUM"),
    exchangeRate: o.exchangeRate != null ? str(o.exchangeRate) : null,
    fTokenPriceUsd: o.f_tokenPriceUsd != null ? str(o.f_tokenPriceUsd) : null,
    tTokenPriceUsd: o.t_tokenPriceUsd != null ? str(o.t_tokenPriceUsd) : null,
    feeInUsd: o.feeInUsd != null ? str(o.feeInUsd) : null,
    fromIdentifier: str(o.fromIdentifier ?? o.f_identifier),
    toIdentifier: str(o.toIdentifier ?? o.t_identifier),
    fromType: str(o.fromType),
    toType: str(o.toType),
    fromUserId: str(o.fromUserId),
    toUserId: str(o.toUserId),
    fromProvider: str(o.fromProvider ?? o.f_provider ?? o.provider),
    toProvider: str(o.toProvider ?? o.t_provider ?? o.provider),
    requestId: str(o.requestId),
    fee: fee || null,
    createdAt: date(o.createdAt),
    updatedAt: date(o.updatedAt),
  };
}

/**
 * Filters transactions to those where the user is involved as sender or receiver.
 * Matches by fromIdentifier or toIdentifier equal to user's email or address (case-insensitive for email).
 */
export function filterTransactionsForUser(
  transactions: TransactionRow[],
  user: { email: string | null; address: string | null }
): TransactionRow[] {
  const email = user.email?.trim().toLowerCase() ?? "";
  const address = user.address?.trim() ?? "";
  if (!email && !address) return [];
  return transactions.filter((tx) => {
    const f = (tx.fromIdentifier ?? "").trim();
    const t = (tx.toIdentifier ?? "").trim();
    const matchEmail = email && (f.toLowerCase() === email || t.toLowerCase() === email);
    const matchAddress = address && (f === address || t === address);
    return !!matchEmail || !!matchAddress;
  });
}

/** Fetches transactions from Core API only. Returns [] if Core is unavailable or returns no data. */
export async function getTransactions(): Promise<TransactionRow[]> {
  try {
    const token = await getSessionToken();
    const result = await getCoreTransactions({ limit: 100 }, token ?? undefined);
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    return raw.map((item) => coreItemToRow(item)).filter((r): r is TransactionRow => r !== null);
  } catch {
    // Core unavailable
  }
  return [];
}
