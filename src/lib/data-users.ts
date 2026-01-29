import { prisma } from "@/lib/prisma";

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

const MOCK_USERS: UserWithTransactions[] = [
  {
    id: "user-1",
    email: "alice@example.com",
    address: "0x1234…abcd",
    createdAt: new Date(),
    transactions: [
      {
        id: "tx-1",
        type: "BUY",
        status: "COMPLETED",
        fromAmount: "100",
        toAmount: "0.04",
        createdAt: new Date(),
      },
    ],
  },
  {
    id: "user-2",
    email: "bob@example.com",
    address: "0x5678…ef01",
    createdAt: new Date(Date.now() - 86400000),
    transactions: [],
  },
];

export async function getUsers(): Promise<UserWithTransactions[]> {
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
    return MOCK_USERS;
  }
}
