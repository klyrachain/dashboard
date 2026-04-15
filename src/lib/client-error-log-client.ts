"use client";

/**
 * POSTs error metadata to /api/client-error for server-side logging.
 * When CLIENT_ERROR_LOG_SECRET is set on the server, set NEXT_PUBLIC_CLIENT_ERROR_LOG_SECRET to the same value so the client can send x-client-error-secret.
 */
export function logClientErrorToServer(payload: {
  message: string;
  digest?: string;
  stack?: string;
  pathname?: string;
}): void {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const pub = process.env.NEXT_PUBLIC_CLIENT_ERROR_LOG_SECRET?.trim();
  if (pub) {
    headers["x-client-error-secret"] = pub;
  }
  void fetch("/api/client-error", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      pathname:
        payload.pathname ??
        (typeof window !== "undefined" ? window.location.pathname : undefined),
    }),
  }).catch(() => {
    /* ignore network failures */
  });
}
