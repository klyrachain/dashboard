import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { InventoryAssetRow } from "@/lib/data-inventory";
import { normalizeInventoryFromApi } from "@/lib/data-inventory";

export type InventoryApiResponse = {
  success: boolean;
  data?: unknown[];
  meta?: { page?: number; limit?: number; total?: number };
};

export const inventoryApi = createApi({
  reducerPath: "inventoryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getInventory: builder.query<InventoryAssetRow[], void | { limit?: number }>({
      query: (params) => ({
        url: "/api/inventory",
        params: params ?? { limit: 100 },
      }),
      transformResponse: (raw: InventoryApiResponse): InventoryAssetRow[] => {
        return normalizeInventoryFromApi(raw);
      },
    }),
  }),
});

export const { useGetInventoryQuery } = inventoryApi;
