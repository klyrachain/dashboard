/** Keep in sync with Core `core/src/lib/merchant-webhook-events.ts`. */

export const MERCHANT_WEBHOOK_EVENT_IDS = [
  "transaction.created",
  "transaction.status_updated",
  "invoice.created",
  "invoice.paid",
  "payout.status_updated",
  "payment_link.paid",
] as const;

export type MerchantWebhookEventId = (typeof MERCHANT_WEBHOOK_EVENT_IDS)[number];

export const MERCHANT_WEBHOOK_EVENT_OPTIONS: { id: MerchantWebhookEventId; label: string }[] = [
  { id: "transaction.created", label: "Transaction created" },
  { id: "transaction.status_updated", label: "Transaction status updated" },
  { id: "invoice.created", label: "Invoice created" },
  { id: "invoice.paid", label: "Invoice paid" },
  { id: "payout.status_updated", label: "Payout status updated" },
  { id: "payment_link.paid", label: "Payment link paid" },
];
