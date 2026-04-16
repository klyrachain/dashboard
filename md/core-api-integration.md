# Core API — Frontend Integration Report

**Purpose:** Single source of truth for the frontend (or any client) to integrate with the **Core** service (Central Point: Webhook + Redis).  
**Update this file** whenever Core API, webhook contract, or realtime events change.

---

## 1. Service overview

- **Role:** Core is the backend "brain." It receives webhook events (e.g. from your API gateway or Backend service), creates transactions, enqueues jobs, updates DB and Redis, and emits realtime events. It does **not** serve end-user HTTP traffic directly.
- **Frontend use case:** Your frontend typically talks to a **Backend** API; that Backend calls Core (e.g. `POST /webhook/order`). The frontend may also subscribe to **Pusher** for transaction status updates.

---

## 2. Base URL and environment

| Env (example) | Description |
|---------------|-------------|
| `NEXT_PUBLIC_CORE_URL` or `VITE_CORE_URL` | Base URL of the Core service (e.g. `https://core.example.com` or `http://localhost:4000`) |
| `CORE_API_KEY` (server-only) | API key for protected routes. Generate with `pnpm key:generate`; set in Core and dashboard `.env`. |

- **Protocol:** HTTPS in production.
- **Default port (dev):** `4000`.
- **Content-Type:** `application/json` for request bodies.

### 2.1 Authentication (Core global preHandler)

- **Public (no auth):** `GET /health`, `GET /ready`.
- **Protected:** All other paths (e.g. `POST /webhook/order`, `POST /webhook/admin`, all `GET /api/*`).
- **Protected requests** must send a valid API key in the **`x-api-key`** header (e.g. the value of `CORE_API_KEY` from `.env`).
- **Responses:** Missing or invalid key → **401 Unauthorized**. Wrong `Origin` when `Origin` is sent → **403 Forbidden**.
- The dashboard sends `x-api-key` from `CORE_API_KEY` on all outbound requests to Core except `/health` and `/ready`.

---

## 3. Endpoints

### 3.1 Health and readiness

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/health` | Liveness (process up). | `200` → `{ "ok": true }` |
| `GET` | `/ready` | Readiness (DB + Redis connected). | `200` → `{ "ok": true }` or `503` → `{ "ok": false, "error": "Database or Redis unavailable" }` |

### 3.2 Fetch API (database, Redis, queue — for admin/dashboard)

All list endpoints support `?page=1&limit=20` (default limit 20, max 100). Responses use envelope `{ success: true, data, meta?: { page, limit, total } }`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List users (paginated). |
| `GET` | `/api/users/:id` | Get user by ID. |
| `GET` | `/api/transactions` | List transactions (paginated). Query: `?status=&type=&f_chain=&t_chain=` optional. |
| `GET` | `/api/transactions/:id` | Get transaction by ID (with fromUser, toUser, request). Responses include `f_chain` and `t_chain`. |
| `GET` | `/api/requests` | List requests (paginated). |
| `GET` | `/api/requests/:id` | Get request by ID (with transaction, claim). |
| `GET` | `/api/claims` | List claims (paginated). Query: `?status=` optional. |
| `GET` | `/api/claims/:id` | Get claim by ID (with request, transaction). |
| `GET` | `/api/wallets` | List wallets (paginated). `encryptedKey` masked. Responses include `supportedChains` (string[]) and `supportedTokens`. |
| `GET` | `/api/wallets/:id` | Get wallet by ID (`encryptedKey` masked). Response includes `supportedChains` and `supportedTokens`. |
| `GET` | `/api/inventory` | List inventory assets (paginated). Query: `?chain=` optional. |
| `GET` | `/api/inventory/:id` | Get inventory asset by ID. |
| `GET` | `/api/inventory/:id/history` | List inventory history for asset (paginated). |
| `GET` | `/api/cache/balances` | List Redis balance keys (query: `?limit=50`). |
| `GET` | `/api/cache/balances/:chain/:token` | Get Redis balance for chain/token. |
| `GET` | `/api/queue/poll` | Poll queue stats (counts, recent waiting/active jobs). Query: `?limit=20`. |

### 3.3 Order webhook (used by Backend → Core)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhook/order` | Create an order/transaction and enqueue it for processing. Called by your Backend, not directly by the browser. |

**Request body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `"buy"` \| `"sell"` \| `"request"` \| `"claim"` | Yes | Order type. |
| `fromIdentifier` | `string` \| `null` | No | Sender identifier (email, address, or phone). |
| `fromType` | `IdentityType` \| `null` | No | One of: `ADDRESS`, `EMAIL`, `NUMBER`. |
| `fromUserId` | `string` (UUID) \| `null` | No | Sender user ID. |
| `toIdentifier` | `string` \| `null` | No | Recipient identifier. |
| `toType` | `IdentityType` \| `null` | No | One of: `ADDRESS`, `EMAIL`, `NUMBER`. |
| `toUserId` | `string` (UUID) \| `null` | No | Recipient user ID. |
| `f_amount` | `number` (positive) | Yes | From-amount (e.g. fiat or source token amount). |
| `t_amount` | `number` (positive) | Yes | To-amount (e.g. crypto or target token amount). |
| `f_price` | `number` (≥ 0) | Yes | From-price (rate). |
| `t_price` | `number` (≥ 0) | Yes | To-price (rate). |
| `f_token` | `string` (non-empty) | Yes | From-asset symbol (e.g. `USDC`, `GHS`). |
| `t_token` | `string` (non-empty) | Yes | To-asset symbol (e.g. `ETH`). |
| `f_chain` | `string` | No | Source chain for f_token (default `"ETHEREUM"`). Enables cross-chain (e.g. BASE → ETHEREUM). |
| `t_chain` | `string` | No | Target chain for t_token (default `"ETHEREUM"`). |
| `f_provider` | `PaymentProvider` | No | Default: `NONE`. See §4. |
| `t_provider` | `PaymentProvider` | No | Default: `NONE`. See §4. |
| `requestId` | `string` (UUID) \| `null` | No | Optional link to a request. |

**Success response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "<transaction-uuid>",
    "status": "PENDING",
    "type": "BUY"
  }
}
```

**Error responses:**

- `400 Bad Request` — Validation failed (e.g. invalid `action`, missing required fields, wrong types).

```json
{
  "success": false,
  "error": "Validation failed",
  "details": { "fieldErrors": { ... }, "formErrors": [] }
}
```

- `500 Internal Server Error` — Server-side failure (e.g. DB error). Client receives a generic message.

```json
{
  "success": false,
  "error": "Something went wrong."
}
```

---

## 4. Enums and types (for frontend)

Use these when building request bodies or handling responses/realtime payloads.

- **IdentityType:** `ADDRESS` \| `EMAIL` \| `NUMBER`
- **PaymentProvider:** `NONE` \| `ANY` \| `SQUID` \| `LIFI` \| `PAYSTACK`
- **TransactionType:** `BUY` \| `SELL` \| `TRANSFER` \| `REQUEST` \| `CLAIM`
- **TransactionStatus:** `ACTIVE` \| `PENDING` \| `COMPLETED` \| `CANCELLED` \| `FAILED`
- **ClaimStatus:** `ACTIVE` \| `CLAIMED` \| `CANCELLED` \| `FAIL`
- **SupportedChain:** `ETHEREUM` \| `BNB` \| `BASE` \| `SOLANA`

---

## 5. Admin dashboard webhook

**Endpoint:** `POST /webhook/admin`

Sends a payload to the admin dashboard: if `ADMIN_WEBHOOK_URL` is set, Core POSTs the body to that URL; it also triggers Pusher channel `admin-dashboard` with event `admin-event`.

**Request body (JSON):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | `string` | Yes | Event name (e.g. `transaction.completed`, `alert`). |
| `data` | `object` | No | Arbitrary payload (default `{}`). |

**Success response:** `202 Accepted`

```json
{
  "success": true,
  "data": { "accepted": true, "event": "<event>" }
}
```

**Dashboard receiver:** Set Core's `ADMIN_WEBHOOK_URL` to this app's `POST /api/webhooks/admin` (e.g. `https://your-dashboard.example.com/api/webhooks/admin`).

**Pusher:** Subscribing to channel `admin-dashboard` and event `admin-event` yields payloads `{ event, data, timestamp }`.

### 5.1 Admin webhook — order lifecycle (live tracking)

After creating a transaction and enqueueing a poll job, Core calls `sendAdminWebhook` with:

| Event | When | Data (typical) |
|-------|------|----------------|
| `order.created` | After POST /webhook/order + enqueue | transactionId, action, type, status, fromIdentifier, toIdentifier, f_amount, t_amount, f_price, t_price, f_token, t_token, feeAmount, feePercent, totalCost, profit (from mock fee service) |
| `order.completed` | Poll worker on COMPLETED | Same fee/price/profit data as order.created |
| `order.failed` | Poll worker on FAILED | transactionId, status, type, f_token, t_token, error |

The dashboard (ADMIN_WEBHOOK_URL + Pusher `admin-dashboard`) receives all order lifecycle events for live tracking.

---

## 6. Quote API (dashboard)

**GET /api/quote** — Prefetch quote for backend before creating a transaction. Backend can call this to show the user cost and fee.

| Query param | Required | Description |
|-------------|----------|-------------|
| action | Yes | `buy` \| `sell` \| `request` \| `claim` |
| f_amount | Yes | From-amount (number) |
| t_amount | Yes | To-amount (number) |
| f_price | Yes | From-price / rate (number) |
| t_price | Yes | To-price (number) |
| f_token | No | From-asset symbol (default USD) |
| t_token | No | To-asset symbol (default TOKEN) |

**Response:** `200` → `{ success: true, data: { feeAmount, feePercent, totalCost, totalReceived, rate, grossValue, profit } }`

Mock fee logic: Buy/Sell 1% on f_amount; Request/Claim 0.5% on f_amount. Replace with real fee provider later.

---

## 7. Realtime (Pusher)

When a transaction's status changes (e.g. to `COMPLETED` or `FAILED`), Core emits Pusher events. Frontend can subscribe to receive live updates.

**Channels (stub / global):**

- `notifications`
- `email`
- `number`

**Event name:** `transaction-status`

**Payload:**

```ts
{
  transactionId: string;   // UUID
  status: TransactionStatus;
  type?: TransactionStatus; // optional; transaction type (e.g. "BUY", "SELL")
}
```

**User-specific channels (optional):** Core can trigger to a custom channel via `triggerToChannel(channel, event, data)`. Channel naming (e.g. `private-user-<userId>`) is defined by your Backend/Core usage; frontend should subscribe to the channel name your Backend documents.

---

## 8. Frontend integration checklist

- [ ] Backend calls Core `POST /webhook/order` with the payload above; frontend does not call this URL directly from the browser (expose via your own API).
- [ ] Frontend uses Backend API to "create order" or "initiate buy/sell/request/claim"; Backend returns the transaction `id` and optionally `status: "PENDING"`.
- [ ] Frontend subscribes to Pusher channel(s) and event `transaction-status` to show status updates (`PENDING` → `COMPLETED` or `FAILED`).
- [ ] Use enums in §4 for dropdowns, filters, and type-safe request/response handling.
- [ ] Handle `success: false` and `error` / `details` for 400 and 500 responses from any Backend endpoint that proxies Core.
- [ ] Admin dashboard: fetch users, transactions, inventory, etc. from Core GET `/api/*`; receive admin events via `POST /api/webhooks/admin` (ADMIN_WEBHOOK_URL) and/or Pusher `admin-dashboard` / `admin-event`.

---

## 9. Prompt for AI / developers

Use the following when asking an AI or a developer to implement frontend integration with Core:

---

**Prompt: Frontend integration with Core (Central Point) API**

We have a backend service called **Core** that handles order/transaction processing and realtime updates. Use this spec to integrate the frontend.

1. **Base URL**  
   Use the env variable for the Core service base URL (e.g. `NEXT_PUBLIC_CORE_URL` or `VITE_CORE_URL`). Default dev: `http://localhost:4000`.

2. **Endpoints**  
   - `GET /health` → liveness; `GET /ready` → readiness (DB + Redis).  
   - `POST /webhook/order` → create order (called by our Backend, not by the browser). Request body must include: `action` (`"buy"` \| `"sell"` \| `"request"` \| `"claim"`), `f_amount`, `t_amount`, `f_price`, `t_price`, `f_token`, `t_token`; optional: `fromIdentifier`, `fromType`, `fromUserId`, `toIdentifier`, `toType`, `toUserId`, `f_provider`, `t_provider`, `requestId`.  
   - Success: `201` with `{ success: true, data: { id, status, type } }`.  
   - Errors: `400` with `{ success: false, error: "Validation failed", details }` or `500` with `{ success: false, error: "Something went wrong." }`.

3. **Enums**  
   Use for request/response and UI: IdentityType (`ADDRESS` \| `EMAIL` \| `NUMBER`), PaymentProvider (`NONE` \| `ANY` \| `SQUID` \| `LIFI` \| `PAYSTACK`), TransactionType (`BUY` \| `SELL` \| `TRANSFER` \| `REQUEST` \| `CLAIM`), TransactionStatus (`ACTIVE` \| `PENDING` \| `COMPLETED` \| `CANCELLED` \| `FAILED`).

4. **Realtime**  
   Subscribe to Pusher channels `notifications`, `email`, `number` (or the channel our Backend documents) and event `transaction-status`. Payload: `{ transactionId, status, type? }`.

5. **Flow**  
   Frontend calls our Backend to create an order; Backend calls Core `/webhook/order` and returns the transaction `id`. Frontend then shows status and subscribes to Pusher for `transaction-status` updates.

6. **Admin dashboard**  
   Fetch data from Core GET `/api/users`, `/api/transactions`, `/api/inventory`, etc. (paginated, optional query params). Receive admin events: set Core's `ADMIN_WEBHOOK_URL` to dashboard `POST /api/webhooks/admin`; subscribe to Pusher channel `admin-dashboard` and event `admin-event` for payloads `{ event, data, timestamp }`.

---

## 10. Changelog

| Date | Change |
|------|--------|
| (update) | Admin webhook order lifecycle (order.created, order.completed, order.failed); GET /api/quote for prefetch fee/quote; mock fee service (src/lib/fee.service.ts). |
| (update) | Added fetch API (users, transactions, requests, claims, wallets, inventory, cache/balances, queue/poll) and POST /webhook/admin for admin dashboard; dashboard receiver at POST /api/webhooks/admin. |
| (initial) | Document created: health, ready, POST /webhook/order, enums, Pusher channels and event, integration checklist, and prompt. |

**When updating:** Add a new row above with the date and a short description of the API/realtime change.
