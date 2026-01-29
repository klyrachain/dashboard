import { prisma } from "@/lib/prisma";
import { SupportedChain } from "@/types/enums";

export type InventoryAssetRow = {
  id: string;
  chain: string;
  token: string;
  balance: string;
  updatedAt: Date;
};

export type InventoryHistoryPoint = {
  date: string;
  balance: number;
  label: string;
};

const MOCK_ASSETS: InventoryAssetRow[] = [
  {
    id: "inv-1",
    chain: SupportedChain.BASE,
    token: "USDC",
    balance: "125000.50",
    updatedAt: new Date(),
  },
  {
    id: "inv-2",
    chain: SupportedChain.ETHEREUM,
    token: "USDC",
    balance: "89000.00",
    updatedAt: new Date(),
  },
  {
    id: "inv-3",
    chain: SupportedChain.BNB,
    token: "USDT",
    balance: "45000.25",
    updatedAt: new Date(),
  },
];

const MOCK_HISTORY: InventoryHistoryPoint[] = [
  { date: "2025-01-22", balance: 200000, label: "USDC on BASE" },
  { date: "2025-01-23", balance: 195000, label: "USDC on BASE" },
  { date: "2025-01-24", balance: 210000, label: "USDC on BASE" },
  { date: "2025-01-25", balance: 205000, label: "USDC on BASE" },
  { date: "2025-01-26", balance: 220000, label: "USDC on BASE" },
  { date: "2025-01-27", balance: 218000, label: "USDC on BASE" },
  { date: "2025-01-28", balance: 225000, label: "USDC on BASE" },
  { date: "2025-01-29", balance: 230000, label: "USDC on BASE" },
];

export async function getInventoryAssets(): Promise<InventoryAssetRow[]> {
  try {
    const rows = await prisma.inventoryAsset.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        chain: true,
        token: true,
        balance: true,
        updatedAt: true,
      },
    });
    return rows;
  } catch {
    return MOCK_ASSETS;
  }
}

export async function getInventoryHistory(): Promise<InventoryHistoryPoint[]> {
  try {
    const rows = await prisma.inventoryHistory.findMany({
      take: 30,
      orderBy: { recordedAt: "asc" },
      select: { balance: true, recordedAt: true },
    });
    return rows.map((r) => ({
      date: r.recordedAt.toISOString().slice(0, 10),
      balance: Number(r.balance),
      label: "Balance",
    }));
  } catch {
    return MOCK_HISTORY;
  }
}
