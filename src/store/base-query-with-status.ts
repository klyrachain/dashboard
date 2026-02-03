import type { BaseQueryApi, BaseQueryFn } from "@reduxjs/toolkit/query";
import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { showStatus } from "./status-indicator-slice";

type RequestArgs = {
  url: string;
  method?: string;
  body?: unknown;
  params?: Record<string, unknown>;
  [key: string]: unknown;
};

const defaultBaseQuery = fetchBaseQuery({
  baseUrl: "",
  credentials: "include",
  prepareHeaders: (headers) => {
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

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
 * Wraps the default baseQuery so all GET/POST/PUT/PATCH requests
 * update the global status indicator (Redux statusIndicator slice).
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

  const result = await defaultBaseQuery(args, api, extraOptions);

  if (result.error) {
    api.dispatch(
      showStatus({
        message: getErrorMessage(result.error),
        type: "error",
      })
    );
  } else {
    if (isMutation) {
      api.dispatch(showStatus({ message: "Saved", type: "saved" }));
    } else {
      api.dispatch(showStatus({ message: "Loaded", type: "saved" }));
    }
  }

  return result;
};
