import { createApi } from "@reduxjs/toolkit/query/react";
import type { InventoryAssetRow } from "@/lib/data-inventory";
import { normalizeInventoryFromApi, coreAssetToRow } from "@/lib/data-inventory";
import { baseQueryWithStatus } from "./base-query-with-status";

export type InventoryApiResponse = {
  success: boolean;
  data?: unknown[];
  meta?: { page?: number; limit?: number; total?: number };
};

export type CreateInventoryBody = {
  chain: string;
  address?: string;
  tokenAddress?: string;
  token?: string;
  symbol?: string;
  balance?: string | number;
  walletAddress?: string;
  chainId?: number;
};

export type UpdateInventoryBody = {
  chain?: string;
  chainId?: number;
  address?: string;
  tokenAddress?: string;
  token?: string;
  symbol?: string;
  balance?: string | number;
};

/** No polling or timed refetch; data updates only via manual refetch or tag invalidation (e.g. webhook). */
export const inventoryApi = createApi({
  reducerPath: "inventoryApi",
  tagTypes: ["Inventory"],
  baseQuery: baseQueryWithStatus,
  keepUnusedDataFor: 300,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  refetchOnMountOrArgChange: false,
  endpoints: (builder) => ({
    getInventory: builder.query<InventoryAssetRow[], void | { limit?: number }>({
      query: (params) => ({
        url: "/api/inventory",
        params: params ?? { limit: 100 },
      }),
      transformResponse: (raw: InventoryApiResponse): InventoryAssetRow[] => {
        return normalizeInventoryFromApi(raw);
      },
      providesTags: ["Inventory"],
    }),

    getInventoryAsset: builder.query<InventoryAssetRow | null, string>({
      query: (id) => ({ url: `/api/inventory/${encodeURIComponent(id)}` }),
      transformResponse: (raw: unknown): InventoryAssetRow | null => {
        const payload =
          raw && typeof raw === "object" && "data" in raw
            ? (raw as { data: unknown }).data
            : raw;
        return coreAssetToRow(payload);
      },
      providesTags: (_result, _error, id) => [{ type: "Inventory", id }],
    }),

    createInventory: builder.mutation<
      { success: boolean; data?: InventoryAssetRow; error?: string },
      CreateInventoryBody
    >({
      query: (body) => ({ url: "/api/inventory", method: "POST", body }),
      invalidatesTags: ["Inventory"],
      transformResponse: (raw: unknown) => {
        const payload =
          raw && typeof raw === "object" && "data" in raw
            ? (raw as { data: unknown }).data
            : raw;
        const row = coreAssetToRow(payload);
        return { success: true, data: row ?? undefined };
      },
      transformErrorResponse: (res: { data?: unknown }) => {
        const data = res?.data as { error?: string } | undefined;
        return { success: false, error: data?.error ?? "Create failed" };
      },
    }),

    updateInventory: builder.mutation<
      { success: boolean; data?: InventoryAssetRow; error?: string },
      { id: string; body: UpdateInventoryBody }
    >({
      query: ({ id, body }) => ({
        url: `/api/inventory/${encodeURIComponent(id)}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => ["Inventory", { type: "Inventory", id }],
      async onQueryStarted({ id, body: updateBody }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const updated = data?.data;
          if (updated?.id) {
            const submitted: Partial<InventoryAssetRow> = {
              chain: updateBody.chain ?? updated.chain,
              token: updateBody.token ?? updateBody.symbol ?? updated.token,
              balance: updateBody.balance != null ? String(updateBody.balance) : updated.balance,
              chainId: updateBody.chainId ?? updated.chainId,
              address: updateBody.address ?? updated.address,
              tokenAddress: updateBody.tokenAddress ?? updated.tokenAddress,
            };
            dispatch(
              inventoryApi.util.updateQueryData("getInventory", undefined, (draft) => {
                const i = draft.findIndex((a) => a.id === id);
                if (i >= 0) draft[i] = { ...draft[i], ...updated, ...submitted };
              })
            );
          }
        } catch {
          // Refetch will run via invalidatesTags; no need to rollback
        }
      },
      transformResponse: (raw: unknown) => {
        const payload =
          raw && typeof raw === "object" && "data" in raw
            ? (raw as { data: unknown }).data
            : raw;
        const row = coreAssetToRow(payload);
        return { success: true, data: row ?? undefined };
      },
      transformErrorResponse: (res: { data?: unknown }) => {
        const data = res?.data as { error?: string } | undefined;
        return { success: false, error: data?.error ?? "Update failed" };
      },
    }),

    deleteInventory: builder.mutation<{ success: boolean; error?: string }, string>({
      query: (id) => ({
        url: `/api/inventory/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => ["Inventory", { type: "Inventory", id }],
      transformErrorResponse: (res: { data?: unknown }) => {
        const data = res?.data as { error?: string } | undefined;
        return { success: false, error: data?.error ?? "Delete failed" };
      },
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useGetInventoryAssetQuery,
  useCreateInventoryMutation,
  useUpdateInventoryMutation,
  useDeleteInventoryMutation,
} = inventoryApi;
