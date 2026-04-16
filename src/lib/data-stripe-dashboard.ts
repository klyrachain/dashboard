/**
 * Mock data for Stripe-style dashboard UI.
 * Keeps page.tsx clean; replace with Core/API when wiring real data.
 */

export type VolumeChartPoint = {
  date: string;
  value: number;
  label: string;
};

export type AtAGlanceCard = {
  title: string;
  value: string;
  sub?: string;
  action?: { label: string; href: string };
  trend?: { value: string; positive: boolean };
};

export type ApiKeyRow = {
  label: string;
  value: string;
  masked?: boolean;
};

export type Recommendation = {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  icon: "lightbulb" | "sparkles";
};

/** Mock curve: Jan 23–29, dips and rises. */
export function getGrossVolumeChartData(): VolumeChartPoint[] {
  const grossVolumeByDay = [
    { dayLabel: "Jan 23", amountUsd: 320 },
    { dayLabel: "Jan 24", amountUsd: 280 },
    { dayLabel: "Jan 25", amountUsd: 450 },
    { dayLabel: "Jan 26", amountUsd: 380 },
    { dayLabel: "Jan 27", amountUsd: 410 },
    { dayLabel: "Jan 28", amountUsd: 290 },
    { dayLabel: "Jan 29", amountUsd: 340 },
  ];
  return grossVolumeByDay.map(({ dayLabel, amountUsd }) => ({
    date: dayLabel,
    value: amountUsd,
    label: `${dayLabel}, 2:00 PM: $${amountUsd.toFixed(2)}`,
  }));
}

export function getNetVolumeChartData(): VolumeChartPoint[] {
  const netVolumeByDay = [
    { dayLabel: "Jan 23", amountUsd: 305 },
    { dayLabel: "Jan 24", amountUsd: 268 },
    { dayLabel: "Jan 25", amountUsd: 432 },
    { dayLabel: "Jan 26", amountUsd: 362 },
    { dayLabel: "Jan 27", amountUsd: 392 },
    { dayLabel: "Jan 28", amountUsd: 278 },
    { dayLabel: "Jan 29", amountUsd: 324 },
  ];
  return netVolumeByDay.map(({ dayLabel, amountUsd }) => ({
    date: dayLabel,
    value: amountUsd,
    label: `${dayLabel}, 2:00 PM: $${amountUsd.toFixed(2)}`,
  }));
}

/** At a glance metrics; wire to Core/API when ready. Empty = no-data card. */
export const stripeAtAGlance: AtAGlanceCard[] = [];

/** Empty until wired to Core merchant keys — avoids showing fake Stripe-style keys to visitors. */
export const stripeApiKeys: ApiKeyRow[] = [];

export const stripeRecommendations: Recommendation[] = [
  {
    id: "revenue-recovery",
    title: "Revenue recovery",
    description:
      "Automate tax compliance from obligation monitoring to collections and filings.",
    buttonLabel: "Start recovery",
    icon: "sparkles",
  },
  {
    id: "invoices",
    title: "Create and send invoices",
    description: "Create and send invoices that customers can pay instantly.",
    buttonLabel: "Get started",
    icon: "lightbulb",
  },
];

export const stripePreviousPeriod = {
  gross: { value: 16.0, changePercent: -100 },
  net: { value: 15.24, changePercent: -100 },
};
