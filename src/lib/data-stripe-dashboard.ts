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
  const base = [
    { d: "Jan 23", v: 320 },
    { d: "Jan 24", v: 280 },
    { d: "Jan 25", v: 450 },
    { d: "Jan 26", v: 380 },
    { d: "Jan 27", v: 410 },
    { d: "Jan 28", v: 290 },
    { d: "Jan 29", v: 340 },
  ];
  return base.map(({ d, v }) => ({
    date: d,
    value: v,
    label: `${d}, 2:00 PM: $${v.toFixed(2)}`,
  }));
}

export function getNetVolumeChartData(): VolumeChartPoint[] {
  const base = [
    { d: "Jan 23", v: 305 },
    { d: "Jan 24", v: 268 },
    { d: "Jan 25", v: 432 },
    { d: "Jan 26", v: 362 },
    { d: "Jan 27", v: 392 },
    { d: "Jan 28", v: 278 },
    { d: "Jan 29", v: 324 },
  ];
  return base.map(({ d, v }) => ({
    date: d,
    value: v,
    label: `${d}, 2:00 PM: $${v.toFixed(2)}`,
  }));
}

/** At a glance metrics; wire to Core/API when ready. Empty = no-data card. */
export const stripeAtAGlance: AtAGlanceCard[] = [];

export const stripeApiKeys: ApiKeyRow[] = [
  { label: "Publishable key", value: "pk_test_51SVC0pABL4h...", masked: false },
  { label: "Secret key", value: "sk_test_••••••••••••••••", masked: true },
];

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
