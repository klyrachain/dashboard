import { prisma } from "@/lib/prisma";
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
  fromPrice: string;
  toPrice: string;
  fromIdentifier: string;
  toIdentifier: string;
  fromType: string;
  toType: string;
  fromUserId: string;
  toUserId: string;
  fromProvider: string;
  toProvider: string;
  requestId: string;
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
  return {
    id,
    type: str(o.type),
    status: str(o.status),
    fromAmount: str(o.fromAmount ?? o.f_amount),
    toAmount: str(o.toAmount ?? o.t_amount),
    fromToken: str(o.fromToken ?? o.f_token),
    toToken: str(o.toToken ?? o.t_token),
    fromPrice: str(o.fromPrice ?? o.f_price),
    toPrice: str(o.toPrice ?? o.t_price),
    fromIdentifier: str(o.fromIdentifier),
    toIdentifier: str(o.toIdentifier),
    fromType: str(o.fromType),
    toType: str(o.toType),
    fromUserId: str(o.fromUserId),
    toUserId: str(o.toUserId),
    fromProvider: str(o.fromProvider ?? o.f_provider ?? o.provider),
    toProvider: str(o.toProvider ?? o.t_provider ?? o.provider),
    requestId: str(o.requestId),
    createdAt: date(o.createdAt),
    updatedAt: date(o.updatedAt),
  };
}

export async function getTransactions(): Promise<TransactionRow[]> {
  try {
    const result = await getCoreTransactions({ limit: 100 });
    if (result.ok && result.data.success && Array.isArray(result.data.data)) {
      const rows = result.data.data
        .map(coreItemToRow)
        .filter((r): r is TransactionRow => r !== null);
      if (rows.length > 0) return rows;
    }
  } catch {
    // fall through to Prisma
  }
  try {
    const rows = await prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        fromAmount: true,
        toAmount: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      fromAmount: r.fromAmount,
      toAmount: r.toAmount,
      fromToken: "",
      toToken: "",
      fromPrice: "",
      toPrice: "",
      fromIdentifier: "",
      toIdentifier: "",
      fromType: "",
      toType: "",
      fromUserId: "",
      toUserId: "",
      fromProvider: r.provider,
      toProvider: r.provider,
      requestId: "",
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch {
    return [];
  }
}
