import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  MerchantApiKeyRow,
  MerchantApiScopeKey,
  MerchantBusinessPatchBody,
  MerchantBusinessProfile,
  MerchantCreateApiKeyBody,
  MerchantCreateApiKeyResult,
  MerchantCrmCustomerCreateBody,
  MerchantCrmCustomerPatchBody,
  MerchantCrmCustomerRow,
  MerchantDerivedCustomerRow,
  MerchantListMeta,
  MerchantPayPageCreateBody,
  MerchantPayPagePatchBody,
  MerchantPayPageRow,
  MerchantPayoutMethodCreateBody,
  MerchantPayoutMethodPatchBody,
  MerchantPayoutMethodRow,
  MerchantProductCreateBody,
  MerchantProductPatchBody,
  MerchantProductRow,
  MerchantSummary,
  MerchantWrappedSummary,
  MerchantSummaryQueryParams,
  MerchantWithdrawBody,
  CheckoutBaseUrlMeta,
  PublicCurrencyItem,
  MerchantFiatQuoteResult,
  MerchantWebhookEndpointRow,
  MerchantWebhookEndpointCreateBody,
  MerchantWebhookEndpointPatchBody,
  MerchantWebhookDeliveryRow,
  MerchantWebhookEndpointSummary,
  MerchantWebhookRevealSecretResult,
} from "@/types/merchant-api";
import { baseQueryWithStatus } from "./base-query-with-status";

const PREFIX = "/api/v1/merchant";

const MERCHANT_SCOPE_CACHE_KEY = "merchantApiScopeKey" satisfies keyof MerchantApiScopeKey;

/** Drop cache-partition key before sending query params to Core. */
function stripMerchantScopeParams(
  params: Record<string, string | number | undefined>
): Record<string, string> {
  const q: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === MERCHANT_SCOPE_CACHE_KEY) continue;
    if (v === undefined || v === "") continue;
    q[k] = String(v);
  }
  return q;
}

function unwrapList<T>(raw: unknown): { items: T[]; meta: MerchantListMeta } {
  if (!raw || typeof raw !== "object") {
    return { items: [], meta: { page: 1, limit: 20, total: 0 } };
  }
  const o = raw as {
    success?: boolean;
    data?: unknown;
    meta?: Partial<MerchantListMeta>;
  };
  const data = o.data;
  const items = Array.isArray(data) ? (data as T[]) : [];
  const m = o.meta ?? {};
  return {
    items,
    meta: {
      page: typeof m.page === "number" ? m.page : 1,
      limit: typeof m.limit === "number" ? m.limit : 20,
      total: typeof m.total === "number" ? m.total : items.length,
    },
  };
}

function unwrapData<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { success?: boolean; data?: unknown };
  if (o.success === true && o.data !== undefined && o.data !== null) {
    return o.data as T;
  }
  if ("data" in o && o.data !== undefined && o.data !== null) {
    return o.data as T;
  }
  return null;
}

export const merchantApi = createApi({
  reducerPath: "merchantApi",
  baseQuery: baseQueryWithStatus,
  tagTypes: [
    "MerchantSummary",
    "MerchantTransactions",
    "MerchantSettlements",
    "MerchantBusiness",
    "MerchantApiKeys",
    "MerchantProducts",
    "MerchantCustomers",
    "MerchantCrmCustomers",
    "MerchantPayPages",
    "MerchantPayoutMethods",
    "MerchantGas",
    "MerchantWrapped",
    "MerchantWebhookEndpoints",
    "MerchantWebhookDeliveries",
    "MerchantWebhookSummary",
  ],
  keepUnusedDataFor: 120,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  endpoints: (builder) => ({
    getMerchantSummary: builder.query<MerchantSummary | null, MerchantSummaryQueryParams>({
      query: (params) => {
        const q: Record<string, string> = {};
        if (params.days != null) q.days = String(params.days);
        if (params.seriesDays != null) q.seriesDays = String(params.seriesDays);
        return {
          url: `${PREFIX}/summary`,
          params: q,
        };
      },
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantSummary>(raw),
      providesTags: ["MerchantSummary"],
    }),
    getMerchantWrappedSummary: builder.query<
      MerchantWrappedSummary | null,
      { period?: "month" | "quarter" | "year" } & MerchantApiScopeKey
    >({
      query: (params) => ({
        url: `${PREFIX}/wrapped/summary`,
        params: stripMerchantScopeParams(params as Record<string, string | number | undefined>),
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantWrappedSummary>(raw),
      providesTags: ["MerchantWrapped"],
    }),
    getMerchantTransactions: builder.query<
      { items: Record<string, unknown>[]; meta: MerchantListMeta },
      Record<string, string | number | undefined> & MerchantApiScopeKey
    >({
      query: (params) => ({
        url: `${PREFIX}/transactions`,
        params: stripMerchantScopeParams(params),
      }),
      transformResponse: (raw: unknown) =>
        unwrapList<Record<string, unknown>>(raw),
      providesTags: ["MerchantTransactions"],
    }),
    getMerchantTransactionById: builder.query<
      Record<string, unknown> | null,
      string
    >({
      query: (id) => ({
        url: `${PREFIX}/transactions/${encodeURIComponent(id)}`,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<Record<string, unknown>>(raw),
    }),
    getMerchantSettlements: builder.query<
      { items: Record<string, unknown>[]; meta: MerchantListMeta },
      Record<string, string | number | undefined> & MerchantApiScopeKey
    >({
      query: (params) => ({
        url: `${PREFIX}/settlements`,
        params: stripMerchantScopeParams(params),
      }),
      transformResponse: (raw: unknown) =>
        unwrapList<Record<string, unknown>>(raw),
      providesTags: ["MerchantSettlements"],
    }),
    getMerchantSettlementById: builder.query<
      Record<string, unknown> | null,
      string
    >({
      query: (id) => ({
        url: `${PREFIX}/settlements/${encodeURIComponent(id)}`,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<Record<string, unknown>>(raw),
    }),
    getMerchantBusiness: builder.query<MerchantBusinessProfile | null, void>({
      query: () => ({ url: `${PREFIX}/business` }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantBusinessProfile>(raw),
      providesTags: ["MerchantBusiness"],
    }),
    patchMerchantBusiness: builder.mutation<
      MerchantBusinessProfile | null,
      MerchantBusinessPatchBody
    >({
      query: (body) => ({
        url: `${PREFIX}/business`,
        method: "PATCH",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantBusinessProfile>(raw),
      invalidatesTags: ["MerchantBusiness"],
    }),
    postMerchantSupportEmailRequestCode: builder.mutation<
      { sent?: boolean } | null,
      { email: string }
    >({
      query: (body) => ({
        url: `${PREFIX}/business/support-email/request-code`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) => unwrapData<{ sent?: boolean }>(raw),
    }),
    postMerchantSupportEmailVerify: builder.mutation<
      MerchantBusinessProfile | null,
      { email: string; code: string }
    >({
      query: (body) => ({
        url: `${PREFIX}/business/support-email/verify`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantBusinessProfile>(raw),
      invalidatesTags: ["MerchantBusiness"],
    }),
    getMerchantApiKeys: builder.query<MerchantApiKeyRow[], void>({
      query: () => ({ url: `${PREFIX}/api-keys` }),
      transformResponse: (raw: unknown) => {
        const { items } = unwrapList<MerchantApiKeyRow>(raw);
        return items;
      },
      providesTags: ["MerchantApiKeys"],
    }),
    createMerchantApiKey: builder.mutation<
      MerchantCreateApiKeyResult,
      MerchantCreateApiKeyBody
    >({
      query: (body) => ({
        url: `${PREFIX}/api-keys`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown): MerchantCreateApiKeyResult => {
        if (!raw || typeof raw !== "object") {
          return { rawKey: "", message: "" };
        }
        const o = raw as {
          success?: boolean;
          data?: MerchantCreateApiKeyResult;
          rawKey?: string;
          message?: string;
        };
        if (o.success === true && o.data?.rawKey) return o.data;
        if (typeof o.rawKey === "string") {
          return { rawKey: o.rawKey, message: o.message };
        }
        const inner = unwrapData<MerchantCreateApiKeyResult>(raw);
        return inner ?? { rawKey: "", message: "" };
      },
      invalidatesTags: ["MerchantApiKeys"],
    }),
    getMerchantWebhookEndpoints: builder.query<MerchantWebhookEndpointRow[], MerchantApiScopeKey>({
      query: () => ({ url: `${PREFIX}/webhooks/endpoints` }),
      transformResponse: (raw: unknown) => {
        const { items } = unwrapList<MerchantWebhookEndpointRow>(raw);
        return items;
      },
      providesTags: ["MerchantWebhookEndpoints"],
    }),
    getMerchantWebhookDeliveries: builder.query<
      { items: MerchantWebhookDeliveryRow[]; meta: MerchantListMeta },
      ({ page?: number; limit?: number; endpointId?: string; from?: string; to?: string } & MerchantApiScopeKey) | void
    >({
      query: (params) => {
        const p = (params ?? {}) as Record<string, string | number | undefined>;
        return { url: `${PREFIX}/webhooks/deliveries`, params: stripMerchantScopeParams(p) };
      },
      transformResponse: (raw: unknown) => unwrapList<MerchantWebhookDeliveryRow>(raw),
      providesTags: ["MerchantWebhookDeliveries"],
    }),
    getMerchantWebhookEndpointSummary: builder.query<
      MerchantWebhookEndpointSummary | null,
      { id: string; from?: string; to?: string }
    >({
      query: ({ id, from, to }) => {
        const q: Record<string, string> = {};
        if (from) q.from = from;
        if (to) q.to = to;
        return {
          url: `${PREFIX}/webhooks/endpoints/${encodeURIComponent(id)}/summary`,
          params: q,
        };
      },
      transformResponse: (raw: unknown) => unwrapData<MerchantWebhookEndpointSummary>(raw),
      providesTags: (_r, _e, arg) => [{ type: "MerchantWebhookSummary", id: arg.id }],
    }),
    postMerchantWebhookRevealSecret: builder.mutation<
      MerchantWebhookRevealSecretResult | null,
      string
    >({
      query: (id) => ({
        url: `${PREFIX}/webhooks/endpoints/${encodeURIComponent(id)}/reveal-secret`,
        method: "POST",
        /** Required: base query sets `Content-Type: application/json`; empty body is rejected by the API. */
        body: {},
      }),
      transformResponse: (raw: unknown) => unwrapData<MerchantWebhookRevealSecretResult>(raw),
    }),
    createMerchantWebhookEndpoint: builder.mutation<
      MerchantWebhookEndpointRow | null,
      MerchantWebhookEndpointCreateBody
    >({
      query: (body) => ({
        url: `${PREFIX}/webhooks/endpoints`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) => {
        if (!raw || typeof raw !== "object") return null;
        const o = raw as { success?: boolean; data?: MerchantWebhookEndpointRow };
        if (o.success === true && o.data) return o.data;
        return unwrapData<MerchantWebhookEndpointRow>(raw);
      },
      invalidatesTags: ["MerchantWebhookEndpoints", "MerchantWebhookDeliveries"],
    }),
    patchMerchantWebhookEndpoint: builder.mutation<
      MerchantWebhookEndpointRow | null,
      { id: string; patch: MerchantWebhookEndpointPatchBody }
    >({
      query: ({ id, patch }) => ({
        url: `${PREFIX}/webhooks/endpoints/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: (raw: unknown) => unwrapData<MerchantWebhookEndpointRow>(raw),
      invalidatesTags: (_r, _e, arg) => [
        "MerchantWebhookEndpoints",
        "MerchantWebhookDeliveries",
        { type: "MerchantWebhookSummary", id: arg.id },
      ],
    }),
    deleteMerchantWebhookEndpoint: builder.mutation<
      { deleted?: boolean; id?: string } | null,
      string
    >({
      query: (id) => ({
        url: `${PREFIX}/webhooks/endpoints/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      transformResponse: (raw: unknown) => unwrapData<{ deleted?: boolean; id?: string }>(raw),
      invalidatesTags: (_r, _e, id) => [
        "MerchantWebhookEndpoints",
        "MerchantWebhookDeliveries",
        { type: "MerchantWebhookSummary", id },
      ],
    }),
    getMerchantProducts: builder.query<
      { items: MerchantProductRow[]; meta: MerchantListMeta },
      Record<string, string | number | undefined> & MerchantApiScopeKey
    >({
      query: (params) => ({
        url: `${PREFIX}/products`,
        params: stripMerchantScopeParams(params),
      }),
      transformResponse: (raw: unknown) =>
        unwrapList<MerchantProductRow>(raw),
      providesTags: ["MerchantProducts"],
    }),
    postMerchantProduct: builder.mutation<
      MerchantProductRow | null,
      MerchantProductCreateBody
    >({
      query: (body) => ({
        url: `${PREFIX}/products`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantProductRow>(raw),
      invalidatesTags: ["MerchantProducts"],
    }),
    patchMerchantProduct: builder.mutation<
      MerchantProductRow | null,
      { id: string; patch: MerchantProductPatchBody }
    >({
      query: ({ id, patch }) => ({
        url: `${PREFIX}/products/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantProductRow>(raw),
      invalidatesTags: ["MerchantProducts"],
    }),
    getMerchantCustomers: builder.query<
      { items: MerchantDerivedCustomerRow[]; meta: MerchantListMeta },
      Record<string, string | number | undefined> & MerchantApiScopeKey
    >({
      query: (params) => ({
        url: `${PREFIX}/customers`,
        params: stripMerchantScopeParams(params),
      }),
      transformResponse: (raw: unknown) =>
        unwrapList<MerchantDerivedCustomerRow>(raw),
      providesTags: ["MerchantCustomers"],
    }),
    getMerchantCrmCustomers: builder.query<
      { items: MerchantCrmCustomerRow[]; meta: MerchantListMeta },
      Record<string, string | number | undefined> & MerchantApiScopeKey
    >({
      query: (params) => ({
        url: `${PREFIX}/crm/customers`,
        params: stripMerchantScopeParams(params),
      }),
      transformResponse: (raw: unknown) =>
        unwrapList<MerchantCrmCustomerRow>(raw),
      providesTags: ["MerchantCrmCustomers"],
    }),
    postMerchantCrmCustomer: builder.mutation<
      MerchantCrmCustomerRow | null,
      MerchantCrmCustomerCreateBody
    >({
      query: (body) => ({
        url: `${PREFIX}/crm/customers`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantCrmCustomerRow>(raw),
      invalidatesTags: ["MerchantCrmCustomers"],
    }),
    patchMerchantCrmCustomer: builder.mutation<
      MerchantCrmCustomerRow | null,
      { id: string; patch: MerchantCrmCustomerPatchBody }
    >({
      query: ({ id, patch }) => ({
        url: `${PREFIX}/crm/customers/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantCrmCustomerRow>(raw),
      invalidatesTags: ["MerchantCrmCustomers"],
    }),
    getCheckoutBaseUrl: builder.query<CheckoutBaseUrlMeta | null, void>({
      query: () => ({ url: "/api/meta/checkout-base-url" }),
      transformResponse: (raw: unknown) => unwrapData<CheckoutBaseUrlMeta>(raw),
    }),
    getPublicCurrencies: builder.query<
      { items: PublicCurrencyItem[] },
      { q?: string } | void
    >({
      query: (arg) => {
        const q =
          arg && typeof arg === "object" && arg.q != null && String(arg.q).trim()
            ? String(arg.q).trim()
            : undefined;
        return {
          url: "/api/public/currencies",
          ...(q ? { params: { q } } : {}),
        };
      },
      transformResponse: (raw: unknown) =>
        unwrapData<{ items: PublicCurrencyItem[] }>(raw) ?? { items: [] },
    }),
    getMerchantPayPages: builder.query<
      { items: MerchantPayPageRow[]; meta: MerchantListMeta },
      Record<string, string | number | undefined> & MerchantApiScopeKey
    >({
      query: (params) => ({
        url: `${PREFIX}/pay-pages`,
        params: stripMerchantScopeParams(params),
      }),
      transformResponse: (raw: unknown) =>
        unwrapList<MerchantPayPageRow>(raw),
      providesTags: ["MerchantPayPages"],
    }),
    postMerchantPayPage: builder.mutation<
      MerchantPayPageRow | null,
      MerchantPayPageCreateBody
    >({
      query: (body) => ({
        url: `${PREFIX}/pay-pages`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantPayPageRow>(raw),
      invalidatesTags: ["MerchantPayPages"],
    }),
    patchMerchantPayPage: builder.mutation<
      MerchantPayPageRow | null,
      { id: string; patch: MerchantPayPagePatchBody }
    >({
      query: ({ id, patch }) => ({
        url: `${PREFIX}/pay-pages/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantPayPageRow>(raw),
      invalidatesTags: ["MerchantPayPages"],
    }),
    postMerchantTransactionRefund: builder.mutation<
      Record<string, unknown> | null,
      {
        transactionId: string;
        body: { amount: number; currency: string; reason?: string };
      }
    >({
      query: ({ transactionId, body }) => ({
        url: `${PREFIX}/transactions/${encodeURIComponent(transactionId)}/refunds`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<Record<string, unknown>>(raw),
      invalidatesTags: ["MerchantTransactions"],
    }),
    getMerchantPayoutMethods: builder.query<MerchantPayoutMethodRow[], void>({
      query: () => ({ url: `${PREFIX}/payout-methods` }),
      transformResponse: (raw: unknown) => {
        const { items } = unwrapList<MerchantPayoutMethodRow>(raw);
        return items;
      },
      providesTags: ["MerchantPayoutMethods"],
    }),
    postMerchantPayoutMethod: builder.mutation<
      MerchantPayoutMethodRow | null,
      MerchantPayoutMethodCreateBody
    >({
      query: (body) => ({
        url: `${PREFIX}/payout-methods`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantPayoutMethodRow>(raw),
      invalidatesTags: ["MerchantPayoutMethods"],
    }),
    patchMerchantPayoutMethod: builder.mutation<
      MerchantPayoutMethodRow | null,
      { id: string; patch: MerchantPayoutMethodPatchBody }
    >({
      query: ({ id, patch }) => ({
        url: `${PREFIX}/payout-methods/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantPayoutMethodRow>(raw),
      invalidatesTags: ["MerchantPayoutMethods"],
    }),
    /** Optional Core route: requests a fiat payout to a saved method. */
    postMerchantSettlementWithdraw: builder.mutation<
      Record<string, unknown> | null,
      MerchantWithdrawBody
    >({
      query: (body) => ({
        url: `${PREFIX}/settlements/withdraw`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<Record<string, unknown>>(raw),
      invalidatesTags: ["MerchantSettlements", "MerchantSummary"],
    }),
    postMerchantFiatQuote: builder.mutation<
      MerchantFiatQuoteResult | null,
      { from: string; to: string; amount?: number }
    >({
      query: (body) => ({
        url: `${PREFIX}/rates/fiat`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantFiatQuoteResult>(raw),
    }),
    getMerchantGasAccount: builder.query<
      {
        businessId: string;
        hasAccount: boolean;
        prepaidBalanceUsd: string;
        clearingBalanceUsd?: string;
        sponsorshipEnabled: boolean;
        lowBalanceWarnUsd: string | null;
        businessName?: string;
        slug?: string;
      } | null,
      void
    >({
      query: () => `${PREFIX}/gas/account`,
      transformResponse: (raw: unknown) => unwrapData(raw),
      providesTags: ["MerchantGas"],
    }),
    postMerchantGasTopupFromClearing: builder.mutation<
      { prepaidBalanceUsd: string; clearingBalanceUsd: string } | null,
      { amountUsd: number; idempotencyKey: string }
    >({
      query: (body) => ({
        url: `${PREFIX}/gas/topup/from-clearing`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) => unwrapData(raw),
      invalidatesTags: ["MerchantGas"],
    }),
    postMerchantGasTopupPrepare: builder.mutation<
      {
        paymentLinkId: string;
        publicCode: string;
        checkoutPath: string;
        checkoutAbsoluteUrl: string;
      } | null,
      { amountUsd: number; purpose: "GAS_TOPUP_FIAT" | "GAS_TOPUP_CRYPTO" }
    >({
      query: (body) => ({
        url: `${PREFIX}/gas/topup/prepare`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) => unwrapData(raw),
      invalidatesTags: ["MerchantGas"],
    }),
    postMerchantGasPaystackInitialize: builder.mutation<
      {
        authorization_url: string;
        access_code: string;
        reference: string;
        transaction_id: string;
      } | null,
      {
        paymentLinkId: string;
        payer_email?: string;
        payer_wallet?: string;
        callback_url?: string;
      }
    >({
      query: (body) => ({
        url: `${PREFIX}/gas/topup/paystack/initialize`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) => unwrapData(raw),
      invalidatesTags: ["MerchantGas"],
    }),
    patchMerchantGasAccount: builder.mutation<
      unknown | null,
      { sponsorshipEnabled?: boolean; lowBalanceWarnUsd?: number | null }
    >({
      query: (body) => ({
        url: `${PREFIX}/gas/account`,
        method: "PATCH",
        body,
      }),
      transformResponse: (raw: unknown) => unwrapData<unknown>(raw),
      invalidatesTags: ["MerchantGas"],
    }),
  }),
});

export const {
  useGetMerchantSummaryQuery,
  useGetMerchantWrappedSummaryQuery,
  useGetMerchantTransactionsQuery,
  useGetMerchantTransactionByIdQuery,
  useGetMerchantSettlementsQuery,
  useGetMerchantSettlementByIdQuery,
  useLazyGetMerchantSettlementByIdQuery,
  useGetMerchantBusinessQuery,
  usePatchMerchantBusinessMutation,
  usePostMerchantSupportEmailRequestCodeMutation,
  usePostMerchantSupportEmailVerifyMutation,
  useGetMerchantApiKeysQuery,
  useCreateMerchantApiKeyMutation,
  useGetMerchantWebhookEndpointsQuery,
  useGetMerchantWebhookDeliveriesQuery,
  useGetMerchantWebhookEndpointSummaryQuery,
  usePostMerchantWebhookRevealSecretMutation,
  useCreateMerchantWebhookEndpointMutation,
  usePatchMerchantWebhookEndpointMutation,
  useDeleteMerchantWebhookEndpointMutation,
  useGetMerchantProductsQuery,
  usePostMerchantProductMutation,
  usePatchMerchantProductMutation,
  useGetMerchantCustomersQuery,
  useGetMerchantCrmCustomersQuery,
  usePostMerchantCrmCustomerMutation,
  usePatchMerchantCrmCustomerMutation,
  useGetMerchantPayPagesQuery,
  useGetCheckoutBaseUrlQuery,
  useGetPublicCurrenciesQuery,
  useLazyGetPublicCurrenciesQuery,
  usePostMerchantPayPageMutation,
  usePatchMerchantPayPageMutation,
  usePostMerchantTransactionRefundMutation,
  useGetMerchantPayoutMethodsQuery,
  usePostMerchantPayoutMethodMutation,
  usePatchMerchantPayoutMethodMutation,
  usePostMerchantSettlementWithdrawMutation,
  usePostMerchantFiatQuoteMutation,
  useGetMerchantGasAccountQuery,
  usePatchMerchantGasAccountMutation,
  usePostMerchantGasTopupFromClearingMutation,
  usePostMerchantGasTopupPrepareMutation,
  usePostMerchantGasPaystackInitializeMutation,
} = merchantApi;
