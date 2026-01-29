import { prisma } from "@/lib/prisma";
import { getCoreUsers } from "@/lib/core-api";

export type UserRow = {
  id: string;
  email: string | null;
  address: string | null;
  createdAt: Date;
};

export type UserWithTransactions = UserRow & {
  transactions: Array<{
    id: string;
    type: string;
    status: string;
    fromAmount: string;
    toAmount: string;
    createdAt: Date;
  }>;
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
  const rawTx = Array.isArray(o.transactions) ? o.transactions : [];
  const transactions = rawTx
    .map((t: unknown) => {
      if (!t || typeof t !== "object") return null;
      const tx = t as Record<string, unknown>;
      return {
        id: String(tx.id ?? ""),
        type: String(tx.type ?? ""),
        status: String(tx.status ?? ""),
        fromAmount: String(tx.fromAmount ?? tx.f_amount ?? ""),
        toAmount: String(tx.toAmount ?? tx.t_amount ?? ""),
        createdAt: tx.createdAt instanceof Date ? tx.createdAt : new Date(String(tx.createdAt ?? "")),
      };
    })
    .filter(Boolean) as UserWithTransactions["transactions"];
  return { id, email, address, createdAt, transactions };
}

export async function getUsers(): Promise<UserWithTransactions[]> {
  try {
    const result = await getCoreUsers({ limit: 100 });
    if (result.ok && result.data.success && Array.isArray(result.data.data)) {
      const rows = result.data.data
        .map(coreUserToRow)
        .filter((r): r is UserWithTransactions => r !== null);
      if (rows.length > 0) return rows;
    }
  } catch {
    // fall through to Prisma
  }
  try {
    const rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        address: true,
        createdAt: true,
        transactions: {
          select: {
            id: true,
            type: true,
            status: true,
            fromAmount: true,
            toAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    return rows as UserWithTransactions[];
  } catch {
    return [];
  }
}
