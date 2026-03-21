import type {
  MerchantSummary,
  MerchantSummarySettlementAmountRow,
} from "@/types/merchant-api";

export function pickString(
  row: Record<string, unknown>,
  keys: string[],
  fallback = "—"
): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).length > 0) return String(v);
  }
  return fallback;
}

export function parseAmountString(raw: string | undefined | null): number {
  if (raw == null || raw === "") return 0;
  const n = Number.parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoneyAmount(
  amount: number,
  currency: string,
  locale = "en-GH"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.length === 3 ? currency : "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function maskDestination(
  type: string,
  details: Record<string, unknown> | undefined
): string {
  const last4 =
    (typeof details?.last4 === "string" && details.last4) ||
    (typeof details?.accountLast4 === "string" && details.accountLast4) ||
    (typeof details?.phoneLast4 === "string" && details.phoneLast4);
  const phone =
    typeof details?.phone === "string"
      ? details.phone
      : typeof details?.msisdn === "string"
        ? details.msisdn
        : undefined;
  const maskedPhone =
    phone && phone.length > 4 ? `•••• ${phone.slice(-4)}` : last4 ? `•••• ${last4}` : "";

  const t = type.toUpperCase();
  if (t.includes("MOBILE") || t.includes("MOMO")) {
    return maskedPhone || "Mobile Money";
  }
  if (t.includes("BANK") || t.includes("ACCOUNT")) {
    return maskedPhone || "Bank account";
  }
  if (t.includes("CRYPTO") || t.includes("WALLET")) {
    return typeof details?.address === "string" && details.address.length > 8
      ? `${String(details.address).slice(0, 6)}…${String(details.address).slice(-4)}`
      : "Crypto wallet";
  }
  return maskedPhone || type;
}

export function payoutMethodLabel(row: {
  type: string;
  currency: string;
  label?: string | null;
  details?: Record<string, unknown>;
}): string {
  if (row.label && row.label.trim()) return row.label.trim();
  const base = row.type.replace(/_/g, " ");
  const tail = maskDestination(row.type, row.details);
  return tail ? `${base}, ${tail}` : `${base} (${row.currency})`;
}

const STATUS_PROCESSING = new Set(["PROCESSING", "PENDING"]);
const STATUS_SCHEDULED = new Set(["SCHEDULED"]);
const STATUS_PAID = new Set(["PAID"]);
const STATUS_FAILED = new Set(["FAILED", "REVERSED"]);

export function getSettlementStatusLabel(status: string): string {
  const u = status.toUpperCase();
  if (u === "PROCESSING") return "Processing";
  if (u === "PAID") return "Paid";
  if (u === "FAILED" || u === "REVERSED") return "Failed";
  if (u === "SCHEDULED") return "Scheduled";
  return status;
}

export function aggregateSettlementSums(
  rows: MerchantSummarySettlementAmountRow[] | undefined,
  statuses: Set<string>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows ?? []) {
    if (!statuses.has(String(row.status).toUpperCase())) continue;
    const cur = row.currency || "USD";
    const n = parseAmountString(row.sum);
    out[cur] = (out[cur] ?? 0) + n;
  }
  return out;
}

export type PayoutOverviewFigures = {
  availableByCurrency: Record<string, number>;
  pendingByCurrency: Record<string, number>;
  lifetimePaidOutByCurrency: Record<string, number>;
};

export function buildPayoutOverviewFromSummary(
  summary: MerchantSummary | null | undefined
): PayoutOverviewFigures {
  if (!summary) {
    return {
      availableByCurrency: {},
      pendingByCurrency: {},
      lifetimePaidOutByCurrency: {},
    };
  }

  const rows = summary.settlements.amountSumByCurrencyAndStatus;
  const fiatAvail = summary.balances?.fiatAvailable;
  const fiatPending = summary.balances?.fiatPending;

  let availableByCurrency: Record<string, number> = {};
  if (fiatAvail && typeof fiatAvail === "object") {
    for (const [c, v] of Object.entries(fiatAvail)) {
      availableByCurrency[c] = parseAmountString(v);
    }
  } else {
    availableByCurrency = aggregateSettlementSums(rows, STATUS_SCHEDULED);
  }

  let pendingByCurrency: Record<string, number> = {};
  if (fiatPending && typeof fiatPending === "object") {
    for (const [c, v] of Object.entries(fiatPending)) {
      pendingByCurrency[c] = parseAmountString(v);
    }
  } else {
    pendingByCurrency = aggregateSettlementSums(rows, STATUS_PROCESSING);
  }

  const lifetimePaidOutByCurrency = aggregateSettlementSums(rows, STATUS_PAID);

  return {
    availableByCurrency,
    pendingByCurrency,
    lifetimePaidOutByCurrency,
  };
}

export function destinationFromRow(row: Record<string, unknown>): string {
  const flat = pickString(row, ["destinationLabel", "destination"], "");
  if (flat !== "—") return flat;
  const m = row.method;
  if (m && typeof m === "object") {
    const o = m as Record<string, unknown>;
    return pickString(o, ["label", "name", "type", "provider"], "—");
  }
  if (typeof m === "string") return m;
  return "—";
}

export { STATUS_FAILED, STATUS_PROCESSING };
