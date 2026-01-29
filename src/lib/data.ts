import { prisma } from "@/lib/prisma";
import { TransactionStatus } from "@/types/enums";

export type RecentTransaction = {
  id: string;
  type: string;
  status: string;
  fromAmount: string;
  toAmount: string;
  createdAt: Date;
};

const MOCK_RECENT: RecentTransaction[] = [
  {
    id: "tx-1",
    type: "BUY",
    status: TransactionStatus.COMPLETED,
    fromAmount: "100",
    toAmount: "0.04",
    createdAt: new Date(),
  },
  {
    id: "tx-2",
    type: "SELL",
    status: TransactionStatus.PENDING,
    fromAmount: "0.02",
    toAmount: "500",
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: "tx-3",
    type: "CLAIM",
    status: TransactionStatus.FAILED,
    fromAmount: "0",
    toAmount: "50",
    createdAt: new Date(Date.now() - 7200000),
  },
];

export async function getRecentTransactions(
  limit: number
): Promise<RecentTransaction[]> {
  try {
    const rows = await prisma.transaction.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        fromAmount: true,
        toAmount: true,
        createdAt: true,
      },
    });
    return rows;
  } catch {
    return MOCK_RECENT.slice(0, limit);
  }
}
