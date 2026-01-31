import { createApi } from "@reduxjs/toolkit/query/react";
import type { ProviderRow } from "@/lib/data-providers";
import { parseProvidersList, parseProvider } from "@/lib/data-providers";
import { baseQueryWithStatus } from "./base-query-with-status";

export type UpdateProviderBody = {
  status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  operational?: boolean;
  enabled?: boolean;
  priority?: number;
  fee?: number | null;
  name?: string | null;
};

export const providersApi = createApi({
  reducerPath: "providersApi",
  tagTypes: ["Providers", "Provider"],
  baseQuery: baseQueryWithStatus,
  endpoints: (builder) => ({
    getProviders: builder.query<ProviderRow[], void>({
      query: () => ({ url: "/api/providers" }),
      transformResponse: (raw: unknown): ProviderRow[] => parseProvidersList(raw),
      providesTags: (result) =>
        result
          ? [
              "Providers",
              ...result.map((p) => ({ type: "Provider" as const, id: p.id })),
            ]
          : ["Providers"],
    }),

    getProvider: builder.query<ProviderRow | null, string>({
      query: (id) => ({ url: `/api/providers/${encodeURIComponent(id)}` }),
      transformResponse: (raw: unknown): ProviderRow | null => parseProvider(raw),
      providesTags: (_result, _error, id) => [{ type: "Provider", id }],
    }),

    updateProvider: builder.mutation<
      { success: boolean; data?: ProviderRow; error?: string },
      { id: string; body: UpdateProviderBody }
    >({
      query: ({ id, body }) => ({
        url: `/api/providers/${encodeURIComponent(id)}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => ["Providers", { type: "Provider", id }],
      transformResponse: (raw: unknown) => {
        const payload =
          raw && typeof raw === "object" && "data" in raw
            ? (raw as { data: unknown }).data
            : raw;
        const row = parseProvider(payload);
        return { success: true, data: row ?? undefined };
      },
      transformErrorResponse: (res: { data?: unknown }) => {
        const data = res?.data as { error?: string } | undefined;
        return { success: false, error: data?.error ?? "Update failed" };
      },
    }),

    rotateProviderKey: builder.mutation<
      { success: boolean; data?: ProviderRow; error?: string },
      { id: string; apiKey: string }
    >({
      query: ({ id, apiKey }) => ({
        url: `/api/providers/${encodeURIComponent(id)}/rotate-key`,
        method: "POST",
        body: { apiKey },
      }),
      invalidatesTags: (_result, _error, { id }) => ["Providers", { type: "Provider", id }],
      transformResponse: (raw: unknown) => {
        const payload =
          raw && typeof raw === "object" && "data" in raw
            ? (raw as { data: unknown }).data
            : raw;
        const row = parseProvider(payload);
        return { success: true, data: row ?? undefined };
      },
      transformErrorResponse: (res: { data?: unknown }) => {
        const data = res?.data as { error?: string } | undefined;
        return { success: false, error: data?.error ?? "Rotate key failed" };
      },
    }),
  }),
});

export const {
  useGetProvidersQuery,
  useGetProviderQuery,
  useUpdateProviderMutation,
  useRotateProviderKeyMutation,
} = providersApi;
