import { prisma } from "@/lib/prisma";

export type TransactionRow = {
  id: string;
  type: string;
  status: string;
  fromAmount: string;
  toAmount: string;
  provider: string;
  createdAt: Date;
};

const MOCK_TRANSACTIONS: TransactionRow[] = [
  {
    id: "tx-001",
    type: "BUY",
    status: "COMPLETED",
    fromAmount: "100",
    toAmount: "0.04",
    provider: "SQUID",
    createdAt: new Date(),
  },
  {
    id: "tx-002",
    type: "SELL",
    status: "FAILED",
    fromAmount: "0.02",
    toAmount: "500",
    provider: "LIFI",
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: "tx-003",
    type: "CLAIM",
    status: "PENDING",
    fromAmount: "0",
    toAmount: "50",
    provider: "PAYSTACK",
    createdAt: new Date(Date.now() - 172800000),
  },
  {
    id: "tx-004",
    type: "BUY",
    status: "COMPLETED",
    fromAmount: "250",
    toAmount: "0.09",
    provider: "SQUID",
    createdAt: new Date(Date.now() - 259200000),
  },
  {
    id: "tx-005",
    type: "TRANSFER",
    status: "CANCELLED",
    fromAmount: "10",
    toAmount: "10",
    provider: "NONE",
    createdAt: new Date(Date.now() - 345600000),
  },
];

export async function getTransactions(): Promise<TransactionRow[]> {
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
    return MOCK_TRANSACTIONS;
  }
}
