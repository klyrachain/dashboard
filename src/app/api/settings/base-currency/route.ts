import { NextResponse } from "next/server";
import { getSettingsFinancials } from "@/lib/data-settings";
import type { QuoteCurrency } from "@/lib/token-rates";

const DEFAULT: QuoteCurrency = "usdc";

export async function GET() {
  const { ok, data } = await getSettingsFinancials();
  const baseCurrency =
    ok && data?.baseCurrency
      ? (data.baseCurrency as QuoteCurrency)
      : DEFAULT;
  return NextResponse.json({
    success: true,
    data: { baseCurrency },
  });
}
