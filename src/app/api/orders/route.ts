/**
 * Backend proxy to Core POST /webhook/order. Requires session (Bearer).
 * Frontend calls this API to create orders; this route calls Core.
 */

import { NextResponse } from "next/server";
import { createOrder } from "@/lib/core-api";
import { getSessionToken, UNAUTH_CORE_MESSAGE } from "@/lib/auth";
import type { CoreWebhookOrderBody } from "@/types/core-api";

const REQUIRED = [
  "action",
  "f_amount",
  "t_amount",
  "f_price",
  "t_price",
  "f_token",
  "t_token",
] as const;

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: UNAUTH_CORE_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: { formErrors: ["Body must be a JSON object"] } },
        { status: 400 }
      );
    }

    const action = (body as Record<string, unknown>).action;
    const validActions = ["buy", "sell", "request", "claim"];
    if (typeof action !== "string" || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: { fieldErrors: { action: "Must be one of: buy, sell, request, claim" } } },
        { status: 400 }
      );
    }

    for (const key of REQUIRED) {
      const v = (body as Record<string, unknown>)[key];
      if (v === undefined || v === null) {
        return NextResponse.json(
          { success: false, error: "Validation failed", details: { fieldErrors: { [key]: "Required" } } },
          { status: 400 }
        );
      }
    }

    const payload = body as CoreWebhookOrderBody;
    const result = await createOrder(payload, token);

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    }
    return NextResponse.json(
      { success: false, error: result.error, details: result.details },
      { status: result.error === "Validation failed" ? 400 : 500 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
