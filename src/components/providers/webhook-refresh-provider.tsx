"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import Pusher from "pusher-js";
import { inventoryApi } from "@/store/inventory-api";

const PUSHER_CHANNEL = "admin-dashboard";
const PUSHER_EVENT = "admin-event";

/**
 * Subscribes to Pusher admin-dashboard / admin-event (triggered by Core on webhook).
 * On event: invalidates inventory cache and calls router.refresh() so Home, Balances,
 * and Transactions server data refetch.
 */
export function WebhookRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useDispatch();
  const pusherRef = useRef<Pusher | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "mt1";

    if (!key) return;

    const pusher = new Pusher(key, {
      cluster,
    });
    pusherRef.current = pusher;

    const channel = pusher.subscribe(PUSHER_CHANNEL);
    channel.bind(PUSHER_EVENT, () => {
      dispatch(inventoryApi.util.invalidateTags(["Inventory"]));
      router.refresh();
    });

    return () => {
      channel.unbind(PUSHER_EVENT);
      pusher.unsubscribe(PUSHER_CHANNEL);
      pusher.disconnect();
      pusherRef.current = null;
    };
  }, [router, dispatch]);

  return <>{children}</>;
}
