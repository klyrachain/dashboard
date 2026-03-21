import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  MerchantApiKeyRow,
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
  MerchantSummaryQueryParams,
  MerchantWithdrawBody,
} from "@/types/merchant-api";
import { baseQueryWithStatus } from "./base-query-with-status";

const PREFIX = "/api/v1/merchant";

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
  ],
  keepUnusedDataFor: 120,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  endpoints: (builder) => ({
    getMerchantSummary: builder.query<
      MerchantSummary | null,
      MerchantSummaryQueryParams | void
    >({
      query: (params) => {
        const p = params ?? {};
        const q: Record<string, string> = {};
        if (p.days != null) q.days = String(p.days);
        if (p.seriesDays != null) q.seriesDays = String(p.seriesDays);
        return {
          url: `${PREFIX}/summary`,
          params: q,
        };
      },
      transformResponse: (raw: unknown) =>
        unwrapData<MerchantSummary>(raw),
      providesTags: ["MerchantSummary"],
    }),
    getMerchantTransactions: builder.query<
      { items: Record<string, unknown>[]; meta: MerchantListMeta },
      Record<string, string | number | undefined>
    >({
      query: (params) => ({
        url: `${PREFIX}/transactions`,
        params: params as Record<string, string>,
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
      Record<string, string | number | undefined>
    >({
      query: (params) => ({
        url: `${PREFIX}/settlements`,
        params: params as Record<string, string>,
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
    getMerchantProducts: builder.query<
      { items: MerchantProductRow[]; meta: MerchantListMeta },
      Record<string, string | number | undefined>
    >({
      query: (params) => ({
        url: `${PREFIX}/products`,
        params: params as Record<string, string>,
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
      Record<string, string | number | undefined>
    >({
      query: (params) => ({
        url: `${PREFIX}/customers`,
        params: params as Record<string, string>,
      }),
      transformResponse: (raw: unknown) =>
        unwrapList<MerchantDerivedCustomerRow>(raw),
      providesTags: ["MerchantCustomers"],
    }),
    getMerchantCrmCustomers: builder.query<
      { items: MerchantCrmCustomerRow[]; meta: MerchantListMeta },
      Record<string, string | number | undefined>
    >({
      query: (params) => ({
        url: `${PREFIX}/crm/customers`,
        params: params as Record<string, string>,
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
    getMerchantPayPages: builder.query<
      { items: MerchantPayPageRow[]; meta: MerchantListMeta },
      Record<string, string | number | undefined>
    >({
      query: (params) => ({
        url: `${PREFIX}/pay-pages`,
        params: params as Record<string, string>,
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
  }),
});

export const {
  useGetMerchantSummaryQuery,
  useGetMerchantTransactionsQuery,
  useGetMerchantTransactionByIdQuery,
  useGetMerchantSettlementsQuery,
  useGetMerchantSettlementByIdQuery,
  useLazyGetMerchantSettlementByIdQuery,
  useGetMerchantBusinessQuery,
  usePatchMerchantBusinessMutation,
  useGetMerchantApiKeysQuery,
  useCreateMerchantApiKeyMutation,
  useGetMerchantProductsQuery,
  usePostMerchantProductMutation,
  usePatchMerchantProductMutation,
  useGetMerchantCustomersQuery,
  useGetMerchantCrmCustomersQuery,
  usePostMerchantCrmCustomerMutation,
  usePatchMerchantCrmCustomerMutation,
  useGetMerchantPayPagesQuery,
  usePostMerchantPayPageMutation,
  usePatchMerchantPayPageMutation,
  usePostMerchantTransactionRefundMutation,
  useGetMerchantPayoutMethodsQuery,
  usePostMerchantPayoutMethodMutation,
  usePatchMerchantPayoutMethodMutation,
  usePostMerchantSettlementWithdrawMutation,
} = merchantApi;
