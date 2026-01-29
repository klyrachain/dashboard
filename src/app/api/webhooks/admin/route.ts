/**
 * Admin webhook receiver — Core POSTs here when ADMIN_WEBHOOK_URL points to this URL.
 * Receives order lifecycle events for live tracking: order.created, order.completed, order.failed.
 * Core also triggers Pusher channel `admin-dashboard` / event `admin-event`.
 * @see md/core-api-integration.md
 */

import { NextResponse } from "next/server";
import type { CoreAdminWebhookBody } from "@/types/core-api";

const ORDER_LIFECYCLE_EVENTS = ["order.created", "order.completed", "order.failed"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Body must be a JSON object" },
        { status: 400 }
      );
    }
    const { event, data } = body as Record<string, unknown>;
    if (typeof event !== "string" || !event.trim()) {
      return NextResponse.json(
        { success: false, error: "Field 'event' is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    const payload: CoreAdminWebhookBody = {
      event: event.trim(),
      data: data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : undefined,
    };
    if (process.env.NODE_ENV === "development") {
      if (ORDER_LIFECYCLE_EVENTS.includes(payload.event)) {
        console.info("[admin webhook] order lifecycle", payload.event, payload.data);
      } else {
        console.info("[admin webhook]", payload.event, payload.data);
      }
    }
    return NextResponse.json(
      { success: true, data: { accepted: true, event: payload.event } },
      { status: 202 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
