/** Shapes aligned with Core `GET /api/v1/merchant/business`. */
export interface MerchantBusinessProfile {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  supportEmail: string | null;
  supportUrl?: string | null;
  kybStatus?: string;
  riskScore?: number | null;
  webhookUrl: string | null;
  country?: string | null;
  createdAt?: string;
  /** Present for business-portal JWT; null for merchant API keys. */
  portalKycStatus?: string | null;
  portalKycProvider?: string | null;
  portalKycVerifiedAt?: string | null;
  /** Earliest active member by `joinedAt` — eligible to drive KYB. */
  isFirstActiveMember?: boolean;
}

export type MerchantBusinessPatchBody = {
  name?: string;
  logoUrl?: string | null;
  website?: string | null;
  webhookUrl?: string | null;
  supportEmail?: string | null;
};

/** `GET /api/v1/merchant/api-keys` row (no raw secret). */
export interface MerchantApiKeyRow {
  id: string;
  name: string;
  domains: string[];
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export interface MerchantCreateApiKeyBody {
  name: string;
  domains?: string[];
  environment?: "TEST" | "LIVE";
}

export interface MerchantCreateApiKeyResult {
  rawKey: string;
  message?: string;
}

/** `GET /api/v1/merchant/webhooks/endpoints` row */
export type MerchantWebhookEventType =
  | "transaction.created"
  | "transaction.status_updated"
  | "invoice.created"
  | "invoice.paid"
  | "payout.status_updated"
  | "payment_link.paid";

export interface MerchantWebhookEndpointRow {
  id: string;
  displayName: string;
  protocolVersion: string;
  url: string;
  events: string[];
  isActive: boolean;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MerchantWebhookEndpointCreateBody = {
  displayName: string;
  url: string;
  events: MerchantWebhookEventType[];
  secret?: string;
  isActive?: boolean;
  protocolVersion?: "v1";
};

export type MerchantWebhookEndpointPatchBody = Partial<
  Pick<MerchantWebhookEndpointCreateBody, "displayName" | "url" | "events" | "secret" | "isActive" | "protocolVersion">
>;

/** `GET /api/v1/merchant/webhooks/deliveries` row */
export interface MerchantWebhookDeliveryRow {
  id: string;
  endpointId: string;
  endpointUrl: string;
  eventType: string;
  status: string;
  httpStatus: number | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  transactionId: string | null;
  createdAt: string;
  /** Present when Core records outbound timing. */
  durationMs?: number | null;
  payload: unknown;
  responseBodyPreview: string | null;
}

/** `GET /api/v1/merchant/webhooks/endpoints/:id/summary` */
export type MerchantWebhookEndpointSummary = {
  endpointId: string;
  from: string;
  to: string;
  totalDeliveries: number;
  failedDeliveries: number;
  errorRatePct: number;
  lastDeliveryAt: string | null;
  avgLatencyMs: number | null;
  buckets: { date: string; successCount: number; failureCount: number }[];
  latencyByDay: { date: string; minMs: number; avgMs: number; maxMs: number }[] | null;
};

export type MerchantWebhookRevealSecretResult = {
  secret: string;
};

export type MerchantListMeta = {
  page: number;
  limit: number;
  total: number;
};

/** `GET /api/v1/merchant/summary` — see md/merchant.v1.md §4.0 */
export type MerchantSummaryStatusCounts = Record<string, number>;

export interface MerchantSummarySeriesPoint {
  date: string;
  transactionCount: number;
  completedVolumeUsd: string;
}

export interface MerchantSummarySettlementAmountRow {
  currency: string;
  status: string;
  sum: string;
}

export interface MerchantSummary {
  periodDays: number;
  seriesDays: number;
  periodFrom: string;
  periodTo: string;
  business: {
    id: string;
    name: string;
    slug: string;
    kybStatus?: string;
  };
  transactions: {
    totalAllTime?: number;
    inPeriod?: number;
    byStatusAllTime?: MerchantSummaryStatusCounts;
    byStatusInPeriod?: MerchantSummaryStatusCounts;
    last24hCount?: number;
    last7dCount?: number;
    volumeUsdInPeriod?: string;
    completedCountInPeriod?: number;
    platformFeesUsdInPeriod?: string;
    merchantFeesUsdInPeriod?: string;
  };
  fees: {
    byCurrency?: Record<string, string>;
    totalConvertedUsd?: string;
  };
  settlements: {
    countByStatus?: MerchantSummaryStatusCounts;
    amountSumByCurrencyAndStatus?: MerchantSummarySettlementAmountRow[];
  };
  /** Checkout payment links: volume, usage, catalog size (Core GET /summary). */
  paymentLinks?: {
    volumeUsdInPeriod?: number;
    completedTxWithLinkCount?: number;
    distinctLinksUsedInPeriod?: number;
    totalPaymentLinks?: number;
  };
  /** When Core exposes treasury / rail split (optional). */
  balances?: {
    fiatAvailable?: Record<string, string>;
    fiatPending?: Record<string, string>;
    cryptoHeld?: Record<string, string>;
  };
  payoutSchedule?: {
    cadence?: "MANUAL" | "DAILY" | "WEEKLY" | string;
    nextRunAt?: string;
    timezone?: string;
  };
  series: MerchantSummarySeriesPoint[];
}

/** `GET /payout-methods` row (see merchant.v1.md §6.7). */
export type MerchantPayoutMethodRow = {
  id: string;
  type: string;
  currency: string;
  isPrimary?: boolean;
  label?: string | null;
  details?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type MerchantPayoutMethodCreateBody = {
  type: string;
  currency: string;
  details: Record<string, unknown>;
  isPrimary?: boolean;
};

export type MerchantPayoutMethodPatchBody = {
  isPrimary?: boolean;
  details?: Record<string, unknown>;
};

/** `POST /settlements/withdraw` — optional Core extension; body may evolve. */
export type MerchantWithdrawBody = {
  amount: string;
  currency: string;
  payoutMethodId: string;
};

/** Include on every tenant-scoped RTK arg so list/detail caches do not cross businesses or TEST/LIVE. */
export type MerchantApiScopeKey = { merchantApiScopeKey: string };

export type MerchantSummaryQueryParams = {
  days?: number;
  seriesDays?: number;
} & MerchantApiScopeKey;

/** `GET /api/v1/merchant/products` row */
export type MerchantProductRow = {
  id: string;
  name: string;
  description?: string | null;
  type?: string;
  price: string;
  currency?: string;
  imageUrl?: string | null;
  isActive?: boolean;
};

export type MerchantProductCreateBody = {
  name: string;
  price: number;
  description?: string;
  type?: "DIGITAL" | "PHYSICAL" | "SERVICE";
  currency?: string;
  imageUrl?: string;
  isActive?: boolean;
};

export type MerchantProductPatchBody = Partial<
  Omit<MerchantProductCreateBody, "price"> & { price?: number }
>;

/** `GET /api/v1/merchant/customers` (derived payers) */
export type MerchantDerivedCustomerRow = {
  identifier: string;
  identityType?: string;
  transactionCount?: number;
  lastActivityAt?: string;
};

/** `GET /api/v1/merchant/crm/customers` */
export type MerchantCrmCustomerRow = {
  id: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
  externalId?: string | null;
  notes?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

export type MerchantCrmCustomerCreateBody = {
  email?: string;
  phone?: string;
  userId?: string;
  displayName?: string;
  externalId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export type MerchantCrmCustomerPatchBody = Partial<MerchantCrmCustomerCreateBody>;

/** Core `GET /api/meta/checkout-base-url` */
export type CheckoutBaseUrlMeta = {
  checkoutBaseUrl: string | null;
};

/** Core `GET /api/public/currencies` item */
export type PublicCurrencyItem = {
  code: string;
  name: string;
  kind: "fiat" | "crypto";
};

/** Core `POST /api/v1/merchant/rates/fiat` (ExchangeRate-API backed). */
export type MerchantFiatQuoteResult = {
  from: string;
  to: string;
  rate: number;
  timeLastUpdateUtc?: string;
  amount?: number;
  convertedAmount?: number;
};

export type MerchantWrappedSummary = {
  period: string;
  totals?: {
    transactions: number;
    completed: number;
    successRate: number;
  };
  topTokens?: Array<{ symbol: string; amount: number }>;
  topChains?: Array<{ chain: string; count: number }>;
  timeline?: Array<Record<string, unknown>>;
};

/** Stored on `PaymentLink.metadata` when the dashboard builds a multi item cart. */
export type MerchantPayPageCartSnapshot = {
  v: 1;
  lines: Array<{
    /** Present for catalog products; omitted for one-off custom lines. */
    productId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  discountPercent?: number;
  discountAmount?: number;
};

/** `GET /api/v1/merchant/pay-pages` (payment links) */
export type MerchantPayPageRow = {
  id: string;
  title: string;
  slug: string;
  /** Opaque segment for public `/checkout/:code` URLs (preferred over slug). */
  publicCode?: string | null;
  description?: string | null;
  type?: string | null;
  productId?: string | null;
  amount?: string | null;
  currency?: string | null;
  chargeKind?: string | null;
  gasSponsorshipEnabled?: boolean;
  isOneTime?: boolean;
  paidAt?: string | null;
  paidByTransactionId?: string | null;
  paidByWalletAddress?: string | null;
  usageCount?: number;
  isActive?: boolean;
  environment?: string;
  /** Core JSON; may include `{ cart: MerchantPayPageCartSnapshot }`. */
  metadata?: Record<string, unknown> | null;
};

export type MerchantPayPageCreateBody = {
  title: string;
  /** Omit to let Core generate a unique slug (`pay-` + random). */
  slug?: string;
  description?: string;
  type?: string;
  productId?: string | null;
  chargeKind?: "FIAT" | "CRYPTO";
  gasSponsorshipEnabled?: boolean;
  isOneTime?: boolean;
  /** Omit for open-amount / pay-what-you-want style links when API allows. */
  amount?: number;
  currency?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
};

export type MerchantPayPagePatchBody = Partial<MerchantPayPageCreateBody>;
