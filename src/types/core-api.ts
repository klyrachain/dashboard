/**
 * Core API types — single source of truth for frontend integration with Core.
 * @see md/core-api-integration.md
 */

import type {
  IdentityType,
  PaymentProvider,
  TransactionStatus,
  TransactionType,
} from "@/types/enums";

/** Order action for POST /webhook/order. */
export type WebhookOrderAction = "buy" | "sell" | "request" | "claim";

/** Request body for Core POST /webhook/order (used by Backend → Core). */
export interface CoreWebhookOrderBody {
  action: WebhookOrderAction;
  fromIdentifier?: string | null;
  fromType?: IdentityType | null;
  fromUserId?: string | null;
  toIdentifier?: string | null;
  toType?: IdentityType | null;
  toUserId?: string | null;
  f_amount: number;
  t_amount: number;
  f_price: number;
  t_price: number;
  f_token: string;
  t_token: string;
  f_provider?: PaymentProvider;
  t_provider?: PaymentProvider;
  requestId?: string | null;
}

/** Success response for POST /webhook/order (201). */
export interface CoreWebhookOrderSuccess {
  success: true;
  data: {
    id: string;
    status: TransactionStatus;
    type: TransactionType;
  };
}

/** Error response for Core API (400 / 500). */
export interface CoreApiError {
  success: false;
  error: string;
  details?: {
    fieldErrors?: Record<string, unknown>;
    formErrors?: unknown[];
  };
}

/** Pusher event payload for transaction-status. */
export interface CoreTransactionStatusPayload {
  transactionId: string;
  status: TransactionStatus;
  type?: TransactionType;
}

/** Health/ready response. */
export interface CoreHealthResponse {
  ok: boolean;
  error?: string;
}

/** Pagination meta from Core list endpoints. */
export interface CorePaginationMeta {
  page: number;
  limit: number;
  total: number;
}

/** Envelope for Core fetch API: { success: true, data, meta? }. */
export interface CoreFetchSuccess<T> {
  success: true;
  data: T;
  meta?: CorePaginationMeta;
}

/** Admin webhook body: POST /webhook/admin. */
export interface CoreAdminWebhookBody {
  event: string;
  data?: Record<string, unknown>;
}

/** Order lifecycle events from Core (ADMIN_WEBHOOK_URL + Pusher admin-dashboard). */

/** order.created — after Core creates transaction and enqueues poll job. */
export interface OrderCreatedPayload {
  transactionId: string;
  action: string;
  type: string;
  status: string;
  fromIdentifier?: string;
  toIdentifier?: string;
  f_amount: number;
  t_amount: number;
  f_price: number;
  t_price: number;
  f_token: string;
  t_token: string;
  feeAmount?: number;
  feePercent?: number;
  totalCost?: number;
  profit?: number;
}

/** order.completed — poll worker on COMPLETED. */
export interface OrderCompletedPayload extends OrderCreatedPayload {
  totalReceived?: number;
}

/** order.failed — poll worker on FAILED. */
export interface OrderFailedPayload {
  transactionId: string;
  status: string;
  type: string;
  f_token: string;
  t_token: string;
  error?: string;
}

/** Admin webhook success: 202 Accepted. */
export interface CoreAdminWebhookSuccess {
  success: true;
  data: { accepted: true; event: string };
}

/** Pusher admin-dashboard event payload: { event, data, timestamp }. */
export interface CoreAdminEventPayload {
  event: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}
