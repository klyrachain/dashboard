import type { BaseQueryApi, BaseQueryFn } from "@reduxjs/toolkit/query";
import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import {
  getBusinessAccessToken,
  getStoredActiveBusinessId,
  getStoredMerchantEnvironment,
} from "@/lib/businessAuthStorage";
import { showStatus } from "./status-indicator-slice";

type RequestArgs = {
  url: string;
  method?: string;
  body?: unknown;
  params?: Record<string, unknown>;
  [key: string]: unknown;
};

/** Minimal slice shape for header injection (avoids circular RootState import). */
type MerchantSessionForHeaders = {
  merchantSession: {
    portalJwt: string | null;
    activeBusinessId: string | null;
    businesses: { id: string }[];
    merchantEnvironment: "TEST" | "LIVE";
  };
};

const MERCHANT_API_SEGMENT = "/api/v1/merchant";

function requestUrl(args: RequestArgs | string): string {
  return typeof args === "string" ? args : (args as RequestArgs).url;
}

function createBaseQueryForRequest(args: RequestArgs | string) {
  const urlSnapshot = requestUrl(args);
  return fetchBaseQuery({
    baseUrl: "",
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json");
      if (urlSnapshot.includes(MERCHANT_API_SEGMENT)) {
        const state = getState() as MerchantSessionForHeaders;
        const ms = state.merchantSession;
        const portalJwt =
          (ms.portalJwt?.trim() || getBusinessAccessToken()?.trim()) ?? "";
        const businessId =
          ms.activeBusinessId?.trim() ||
          getStoredActiveBusinessId()?.trim() ||
          (ms.businesses.length === 1 ? ms.businesses[0].id : null);
        if (portalJwt) {
          headers.set("Authorization", `Bearer ${portalJwt}`);
        }
        if (businessId) {
          headers.set("X-Business-Id", businessId);
        }
        const env =
          ms.merchantEnvironment ?? getStoredMerchantEnvironment() ?? "LIVE";
        headers.set("x-merchant-environment", env);
      }
      return headers;
    },
  });
}

function getMethod(args: RequestArgs | string): string {
  if (typeof args === "string") return "GET";
  const method = (args?.method as string)?.toUpperCase();
  return method || "GET";
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Request failed";
  const o = error as { status?: number; data?: unknown };
  if (typeof o.data === "object" && o.data !== null && "error" in o.data) {
    return String((o.data as { error: string }).error);
  }
  if (o.status === 400) return "Bad request";
  if (o.status === 401) return "Unauthorized";
  if (o.status === 403) return "Forbidden";
  if (o.status === 404) return "Not found";
  if (o.status && o.status >= 500) return "Server error";
  return "Request failed";
}

/**
 * RTK Query base query with status toasts. Injects `Authorization` and
 * `X-Business-Id` for any request whose URL contains `/api/v1/merchant`.
 */
export const baseQueryWithStatus: BaseQueryFn = async (
  args: RequestArgs | string,
  api: BaseQueryApi,
  extraOptions: unknown
) => {
  const method = getMethod(args as RequestArgs);
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isMutation) {
    api.dispatch(showStatus({ message: "Saving…", type: "saving" }));
  } else {
    api.dispatch(showStatus({ message: "Loading…", type: "saving" }));
  }

  const dynamicQuery = createBaseQueryForRequest(args);
  const result = await dynamicQuery(args, api, extraOptions as object);

  if (result.error) {
    api.dispatch(
      showStatus({
        message: getErrorMessage(result.error),
        type: "error",
      })
    );
  } else if (isMutation) {
    api.dispatch(showStatus({ message: "Saved", type: "saved" }));
  } else {
    api.dispatch(showStatus({ message: "Loaded", type: "saved" }));
  }

  return result;
};
