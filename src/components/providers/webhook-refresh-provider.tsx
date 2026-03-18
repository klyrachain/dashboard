"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { inventoryApi } from "@/store/inventory-api";
import { incrementWebhookTrigger } from "@/store/webhook-slice";

const WEBHOOK_STREAM_URL = "/api/webhooks/stream";

/**
 * Connects to GET /api/webhooks/stream (SSE). When Core POSTs to /api/webhooks/admin,
 * we increment webhook trigger (for volume/charts), invalidate inventory, and
 * router.refresh() in startTransition so UI updates in place without full loading states.
 */
export function WebhookRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useDispatch();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    const es = new EventSource(WEBHOOK_STREAM_URL);
    eventSourceRef.current = es;

    es.onmessage = () => {
      dispatch(incrementWebhookTrigger());
      dispatch(inventoryApi.util.invalidateTags(["Inventory"]));
      startTransition(() => router.refresh());
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [router, dispatch]);

  return <>{children}</>;
}
