import type { MerchantWebhookDeliveryRow } from "@/types/merchant-api";

const BUCKET_DAYS = 14;

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function lastNDayKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function isDeliverySuccess(d: MerchantWebhookDeliveryRow): boolean {
  return (
    d.status === "DELIVERED" &&
    (d.httpStatus == null || (d.httpStatus >= 200 && d.httpStatus < 300))
  );
}

/**
 * Activity = delivery volume per day.
 * Response sparkline = proxy for latency: daily success ratio (0–1 scaled to counts for the mini chart).
 * Core does not yet persist per-request duration; see comment on the webhooks table.
 */
export function buildWebhookEndpointCharts(
  allDeliveries: MerchantWebhookDeliveryRow[],
  endpointId: string
): {
  activitySeries: number[];
  /** Per-bucket success ratio 0..1 for a “health” sparkline (not wall-clock latency). */
  responseProxySeries: number[];
  errorRatePct: number;
} {
  const keys = lastNDayKeys(BUCKET_DAYS);
  const forEp = allDeliveries.filter((d) => d.endpointId === endpointId);
  const activityMap = new Map<string, number>();
  const successMap = new Map<string, number>();
  const totalMap = new Map<string, number>();
  for (const k of keys) {
    activityMap.set(k, 0);
    successMap.set(k, 0);
    totalMap.set(k, 0);
  }
  for (const d of forEp) {
    const k = dayKey(d.createdAt);
    if (!k || !activityMap.has(k)) continue;
    activityMap.set(k, (activityMap.get(k) ?? 0) + 1);
    totalMap.set(k, (totalMap.get(k) ?? 0) + 1);
    if (isDeliverySuccess(d)) {
      successMap.set(k, (successMap.get(k) ?? 0) + 1);
    }
  }
  const activitySeries = keys.map((k) => activityMap.get(k) ?? 0);
  const responseProxySeries = keys.map((k) => {
    const t = totalMap.get(k) ?? 0;
    if (t === 0) return 0;
    return (successMap.get(k) ?? 0) / t;
  });
  const failed = forEp.filter((d) => !isDeliverySuccess(d)).length;
  const errorRatePct = forEp.length === 0 ? 0 : Math.round((100 * failed) / forEp.length);

  return { activitySeries, responseProxySeries, errorRatePct };
}
