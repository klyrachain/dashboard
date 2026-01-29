import { prisma } from "@/lib/prisma";
import { getCoreTransactions } from "@/lib/core-api";

export type TransactionRow = {
  id: string;
  type: string;
  status: string;
  fromAmount: string;
  toAmount: string;
  provider: string;
  createdAt: Date;
};

/** Normalize Core API transaction item to TransactionRow (supports camelCase or snake_case). */
function coreItemToRow(item: unknown): TransactionRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const type = typeof o.type === "string" ? o.type : "";
  const status = typeof o.status === "string" ? o.status : "";
  const fromAmount = String(o.fromAmount ?? o.f_amount ?? "");
  const toAmount = String(o.toAmount ?? o.t_amount ?? "");
  const provider = String(o.provider ?? o.f_provider ?? o.t_provider ?? "NONE");
  const createdAt = o.createdAt instanceof Date ? o.createdAt : new Date(String(o.createdAt ?? ""));
  if (!id) return null;
  return { id, type, status, fromAmount, toAmount, provider, createdAt };
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
      },
    });
    return rows;
  } catch {
    return [];
  }
}
