/**
 * Prefetch quote API for backend/frontend.
 * GET /api/quote?action=&f_amount=&t_amount=&f_price=&t_price=&f_token=&t_token=
 * Returns feeAmount, feePercent, totalCost, totalReceived, rate, grossValue, profit.
 * Backend can call this before creating a transaction to show the user cost and fee.
 */

import { NextResponse } from "next/server";
import {
  getFeeForOrder,
  type FeeOrderInput,
  type OrderAction,
} from "@/lib/fee.service";

const VALID_ACTIONS: OrderAction[] = ["buy", "sell", "request", "claim"];

function parseNum(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action")?.toLowerCase();
    if (
      !action ||
      typeof action !== "string" ||
      !VALID_ACTIONS.includes(action as OrderAction)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or missing 'action'. Must be one of: buy, sell, request, claim",
        },
        { status: 400 }
      );
    }

    const f_amount = parseNum(searchParams.get("f_amount"));
    const t_amount = parseNum(searchParams.get("t_amount"));
    const f_price = parseNum(searchParams.get("f_price"));
    const t_price = parseNum(searchParams.get("t_price"));
    const f_token = searchParams.get("f_token")?.trim() ?? "";
    const t_token = searchParams.get("t_token")?.trim() ?? "";
    const f_chain = searchParams.get("f_chain")?.trim() ?? "ETHEREUM";
    const t_chain = searchParams.get("t_chain")?.trim() ?? "ETHEREUM";

    if (
      f_amount === null ||
      t_amount === null ||
      f_price === null ||
      t_price === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing or invalid numeric params: f_amount, t_amount, f_price, t_price",
        },
        { status: 400 }
      );
    }
    if (f_amount < 0 || t_amount < 0 || f_price < 0 || t_price < 0) {
      return NextResponse.json(
        { success: false, error: "Amounts and prices must be non-negative" },
        { status: 400 }
      );
    }

    const input: FeeOrderInput = {
      action: action as OrderAction,
      f_amount,
      t_amount,
      f_price,
      t_price,
      f_token: f_token || "USD",
      t_token: t_token || "TOKEN",
      f_chain,
      t_chain,
    };

    const data = getFeeForOrder(input);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong." },
      { status: 500 }
    );
  }
}
