/** Shapes aligned with Core `GET /api/v1/merchant/business`. */
export interface MerchantBusinessProfile {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  supportEmail: string | null;
  kybStatus?: string;
  riskScore?: number | null;
  webhookUrl: string | null;
  country?: string | null;
  createdAt?: string;
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

export type MerchantSummaryQueryParams = {
  days?: number;
  seriesDays?: number;
};

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
  isActive?: boolean;
  environment?: string;
};

export type MerchantPayPageCreateBody = {
  title: string;
  /** Omit to let Core generate a unique slug (`pay-` + random). */
  slug?: string;
  description?: string;
  type?: string;
  productId?: string;
  chargeKind?: "FIAT" | "CRYPTO";
  /** Omit for open-amount / pay-what-you-want style links when API allows. */
  amount?: number;
  currency?: string;
  isActive?: boolean;
};

export type MerchantPayPagePatchBody = Partial<MerchantPayPageCreateBody>;
