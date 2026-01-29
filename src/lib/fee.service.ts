/**
 * Mock fee/quote service for orders. Replace with real fee provider later.
 * Used by GET /api/quote and by Core (or backend) for order.created / order.completed payloads.
 */

export type OrderAction = "buy" | "sell" | "request" | "claim";

export interface FeeOrderInput {
  action: OrderAction;
  f_amount: number;
  t_amount: number;
  f_price: number;
  t_price: number;
  f_token: string;
  t_token: string;
}

export interface FeeQuoteResult {
  feeAmount: number;
  feePercent: number;
  totalCost: number;
  totalReceived: number;
  rate: number;
  grossValue: number;
  profit: number;
}

const BUY_SELL_FEE_PERCENT = 1;
const REQUEST_CLAIM_FEE_PERCENT = 0.5;

/**
 * Mock fee/quote for an order.
 * - Buy: 1% fee on f_amount; totalCost = f_amount + fee.
 * - Sell: 1% fee on f_amount; totalReceived = f_amount - fee.
 * - Request / Claim: 0.5% fee on f_amount; totalCost = f_amount + fee.
 * Returns feeAmount, feePercent, totalCost, totalReceived, rate, grossValue, profit (platform fee income).
 */
export function getFeeForOrder(input: FeeOrderInput): FeeQuoteResult {
  const { action, f_amount, t_amount, f_price, t_price } = input;
  const feePercent =
    action === "buy" || action === "sell"
      ? BUY_SELL_FEE_PERCENT
      : REQUEST_CLAIM_FEE_PERCENT;
  const feeAmount = (f_amount * feePercent) / 100;
  const grossValue = f_amount;

  let totalCost: number;
  let totalReceived: number;

  switch (action) {
    case "buy":
      totalCost = f_amount + feeAmount;
      totalReceived = t_amount;
      break;
    case "sell":
      totalCost = t_amount;
      totalReceived = f_amount - feeAmount;
      break;
    case "request":
    case "claim":
      totalCost = f_amount + feeAmount;
      totalReceived = t_amount;
      break;
    default:
      totalCost = f_amount + feeAmount;
      totalReceived = t_amount;
  }

  return {
    feeAmount,
    feePercent,
    totalCost,
    totalReceived,
    rate: f_price,
    grossValue,
    profit: feeAmount,
  };
}

/**
 * Returns platform fee income for an order (same as getFeeForOrder(input).profit).
 */
export function getProfitForOrder(input: FeeOrderInput): number {
  return getFeeForOrder(input).profit;
}
