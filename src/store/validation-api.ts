import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  FailedValidationRow,
  RecentFailedItem,
  FailedValidationReport,
} from "@/lib/data-validation";
import {
  normalizeFailedValidationList,
  normalizeRecentFailedList,
  parseFailedValidationReport,
} from "@/lib/data-validation";
import { baseQueryWithStatus } from "./base-query-with-status";

export type GetFailedValidationsParams = {
  page?: number;
  limit?: number;
  code?: string;
};

/** No polling or timed refetch; data updates only via manual refetch or tag invalidation. */
export const validationApi = createApi({
  reducerPath: "validationApi",
  tagTypes: ["ValidationFailed", "ValidationReport"],
  baseQuery: baseQueryWithStatus,
  keepUnusedDataFor: 300,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  refetchOnMountOrArgChange: false,
  endpoints: (builder) => ({
    getFailedValidations: builder.query<
      { items: FailedValidationRow[]; meta: { page: number; limit: number; total: number } },
      GetFailedValidationsParams | void
    >({
      query: (params) => ({
        url: "/api/validation/failed",
        params: params ?? { page: 1, limit: 20 },
      }),
      transformResponse: (raw: unknown) => {
        if (!raw || typeof raw !== "object") {
          return { items: [], meta: { page: 1, limit: 20, total: 0 } };
        }
        const o = raw as { success?: boolean; data?: unknown[]; meta?: { page?: number; limit?: number; total?: number } };
        const items = normalizeFailedValidationList(raw);
        const meta = o.meta ?? { page: 1, limit: 20, total: items.length };
        return {
          items,
          meta: {
            page: meta.page ?? 1,
            limit: meta.limit ?? 20,
            total: meta.total ?? items.length,
          },
        };
      },
      providesTags: ["ValidationFailed"],
    }),

    getRecentFailed: builder.query<RecentFailedItem[], number | void>({
      query: (limit = 50) => ({
        url: "/api/validation/failed/recent",
        params: { limit },
      }),
      transformResponse: (raw: unknown) => {
        if (!raw || typeof raw !== "object") return [];
        const o = raw as { success?: boolean; data?: unknown[] };
        if (o.success !== true || !Array.isArray(o.data)) return [];
        return normalizeRecentFailedList(raw);
      },
      providesTags: ["ValidationFailed"],
    }),

    getFailedReport: builder.query<FailedValidationReport | null, number | void>({
      query: (days = 7) => ({
        url: "/api/validation/failed/report",
        params: { days },
      }),
      transformResponse: (raw: unknown) => {
        if (!raw || typeof raw !== "object") return null;
        const o = raw as { success?: boolean; data?: unknown };
        const payload = o.data ?? raw;
        return parseFailedValidationReport(payload);
      },
      providesTags: ["ValidationReport"],
    }),

  }),
});

export const {
  useGetFailedValidationsQuery,
  useGetRecentFailedQuery,
  useGetFailedReportQuery,
} = validationApi;
