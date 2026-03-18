/**
 * In-memory notifier for admin webhook events.
 * POST /api/webhooks/admin calls broadcast(); GET /api/webhooks/stream subscribers receive it.
 * Used to push webhook-driven refresh to clients without polling or timers.
 */

type Listener = () => void;

const listeners: Set<Listener> = new Set();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function broadcast(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore per-listener errors
    }
  });
}
