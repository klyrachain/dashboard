import type { TransactionRow } from "@/lib/data-transactions";

/** Chains treated as fiat / off-ramp legs in rollup (not shown as “crypto” rows). */
const FIAT_CHAINS = new Set(["momo", "bank"]);

function isFiatChain(chain: string): boolean {
  const c = chain.trim().toLowerCase();
  return c === "" || FIAT_CHAINS.has(c);
}

/**
 * Sum completed transaction token legs on non-fiat chains (same normalized rows as Transactions).
 * Each leg (from / to) is counted separately when both are non-fiat (e.g. swaps).
 * Filter by `periodFrom` when provided so totals align with summary reporting window.
 */
export function rollupRecordedNonFiatTokenTotals(
  rows: TransactionRow[],
  periodFromIso: string | undefined
): Array<{
  chain: string;
  token: string;
  total: number;
  legCount: number;
}> {
  const since = periodFromIso ? Date.parse(periodFromIso) : NaN;
  const map = new Map<string, { total: number; legCount: number }>();

  const add = (chain: string, token: string, amountStr: string) => {
    const ch = chain.trim();
    const tk = token.trim();
    if (!tk || isFiatChain(ch)) return;
    const n = Number.parseFloat(String(amountStr).replace(/,/g, ""));
    if (!Number.isFinite(n) || n === 0) return;
    const k = `${ch}|||${tk}`;
    const cur = map.get(k) ?? { total: 0, legCount: 0 };
    cur.total += n;
    cur.legCount += 1;
    map.set(k, cur);
  };

  for (const r of rows) {
    if (String(r.status).toUpperCase() !== "COMPLETED") continue;
    if (!Number.isNaN(since) && r.createdAt.getTime() < since) continue;
    add(r.fromChain, r.fromToken, r.fromAmount);
    add(r.toChain, r.toToken, r.toAmount);
  }

  return Array.from(map.entries())
    .map(([k, v]) => {
      const [chain, token] = k.split("|||");
      return { chain, token, total: v.total, legCount: v.legCount };
    })
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

export function formatRollupTokenAmount(n: number, token: string): string {
  const abs = Math.abs(n);
  const maxFrac = abs >= 1 ? 6 : abs >= 0.0001 ? 8 : 12;
  const s = n.toLocaleString("en-US", {
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: 0,
  });
  return `${s} ${token}`;
}
