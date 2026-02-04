/**
 * Server-Sent Events stream for webhook-driven refresh.
 * Clients connect with EventSource; when POST /api/webhooks/admin receives an event,
 * we broadcast and all connected clients receive "refresh" and can invalidate cache + router.refresh().
 * No polling or timers.
 */

import { subscribe as subscribeNotifier } from "@/lib/webhook-notifier";

const SSE_PAYLOAD = "data: refresh\n\n";

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const unsubscribe = subscribeNotifier(() => {
        try {
          controller.enqueue(encoder.encode(SSE_PAYLOAD));
        } catch {
          // client may have disconnected
        }
      });

      request.signal?.addEventListener?.("abort", () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
