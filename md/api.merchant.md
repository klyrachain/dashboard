# Merchant API v1 — dashboard integration guide

Base path: **`/api/v1/merchant`** (mounted on Core, e.g. `https://api.example.com/api/v1/merchant`).

This namespace is **tenant-only**: every query is scoped to a single **`businessId`**. It is **not** the platform `/api/connect/*` surface (super-admin / global aggregates).

---

## 1. Authentication

Every request under `/api/v1/merchant/*` must satisfy **one** of the following.

### A. Business portal (dashboard user)

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer <accessToken>` — portal JWT from `POST /api/business-auth/login` (or register / magic-link consume / passkey verify). |
| `X-Business-Id` | UUID of the business. The JWT `sub` (user id) must be an **active** `BusinessMember` of that business. |

Obtain candidate business ids from **`GET /api/business-auth/session`** (`data.businesses[].id`). The dashboard should persist the user’s chosen business (e.g. localStorage + header on each request).

### B. Merchant API key

| Header | Value |
|--------|--------|
| `x-api-key` | A key created for that business (`sk_live_...`). |

Optional: **`X-Business-Id`** — if sent, it **must** equal the key’s `businessId` or the request returns **403** `BUSINESS_ID_MISMATCH`.

### Rejected contexts

- **Platform admin session** (cookie / Bearer admin token) **without** a merchant `x-api-key` → **403** `MERCHANT_CONTEXT_REQUIRED`.
- Missing both valid portal JWT + membership **and** merchant key → **401** / **403** with codes such as `MERCHANT_UNAUTHORIZED`, `MISSING_BUSINESS_ID`, `BUSINESS_ACCESS_DENIED`.

**CORS:** If the dashboard is on another origin, Core must allow that origin for `Authorization` and `X-Business-Id` preflight.

---

## 2. Response envelope

Successful reads/lists:

```json
{ "success": true, "data": ... }
```

Lists with pagination:

```json
{ "success": true, "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 42 } }
```

Errors:

```json
{ "success": false, "error": "Human message", "code": "OPTIONAL_CODE" }
```

Permission denied (rare if auth is correct):

```json
{ "success": false, "error": "Your role or key does not allow this action.", "code": "FORBIDDEN_PERMISSION" }
```

---

## 3. Pagination

Query params (where applicable):

| Param | Default | Max |
|-------|---------|-----|
| `page` | `1` | — |
| `limit` | `20` | `100` |

---

## 4. Endpoints

All paths below are relative to **`/api/v1/merchant`**.

### 4.0 Summary (dashboard KPIs)

**`GET /summary`**

Pre-aggregated tenant metrics for home / charts. Query: `days` (default `30`, max `365`), `seriesDays` (default `7`, max `90`) for the daily time series.

Response `data` includes: `periodDays`, `seriesDays`, `periodFrom`, `periodTo`, `business`, `transactions` (totals, status breakdowns, volume/fees USD in period), `fees`, `settlements`, `series` (`date`, `transactionCount`, `completedVolumeUsd` per day).

**Dashboard mapping:** Merchant home KPIs, charts — see `md/merchant.v1.md` for full field list.

### 4.1 Transactions

**`GET /transactions`**

- Query: `page`, `limit`, optional `status` (`ACTIVE` | `PENDING` | `COMPLETED` | `CANCELLED` | `FAILED`), optional `type` (`BUY` | `SELL` | `TRANSFER` | `REQUEST` | `CLAIM`).
- Returns only rows where **`transaction.businessId`** equals the resolved tenant `businessId`.
- `data[]`: full transaction fields with decimals as strings (`f_amount`, `t_amount`, fees, serialized USD price fields), plus `fromUser` / `toUser` summaries.

**`GET /transactions/:id`**

- Single transaction; **404** if id exists but belongs to another business.
- Includes `fromUser`, `toUser`, `request` where applicable.

**Dashboard mapping:** Transactions list, transaction detail; for home KPIs use **`GET /summary`** or aggregate from this list.

---

### 4.2 Settlements (payouts)

**`GET /settlements`**

- Query: `page`, `limit`, optional `status` (`SCHEDULED` | `PROCESSING` | `PAID` | `FAILED` | `REVERSED` or `all`).
- Scoped to **`payout.businessId`**.

**`GET /settlements/:id`**

- Single payout for that business; includes `business`, `method`, amounts, `timeline`, `sourceTransactions` (currently empty array; reserved).

**Dashboard mapping:** “Payouts” / settlements pages (replaces calling `/api/connect/settlements` for tenants).

---

### 4.3 Business profile

**`GET /business`**

- Returns: `id`, `name`, `slug`, `logoUrl`, `website`, `supportEmail`, `kybStatus`, `riskScore`, `webhookUrl`, `country`, `createdAt`.

**`PATCH /business`**

- JSON body; all fields optional; send at least one:
  - `name` — string, 1–200 chars  
  - `logoUrl`, `website`, `webhookUrl` — valid URL or `null` to clear  
  - `supportEmail` — email or `null`  

Invalid body → **400** with Zod `details`.

**Dashboard mapping:** Settings → Business profile / webhooks (webhook URL lives here).

---

### 4.4 API keys (merchant keys)

**`GET /api-keys`**

- Lists keys for the tenant business (no raw secrets): `id`, `name`, `domains`, `keyPrefix`, `isActive`, `lastUsedAt`, `expiresAt`.

**`POST /api-keys`**

- Body: `{ "name": "string" }`, optional `{ "domains": ["https://app.example.com"] }` (default `["*"]`).
- Response: `{ "rawKey": "sk_live_...", "message": "..." }` — **shown once**; persist immediately.

**Dashboard mapping:** Developers → API keys (create/list). Keys created here are scoped to the current `businessId`.

---

## 5. TypeScript-friendly fetch example

```ts
const CORE = process.env.NEXT_PUBLIC_CORE_URL!; // no trailing slash

async function merchantFetch<T>(
  path: string,
  opts: RequestInit & { token: string; businessId: string }
): Promise<T> {
  const res = await fetch(`${CORE}/api/v1/merchant${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.token}`,
      "X-Business-Id": opts.businessId,
      ...opts.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? res.statusText);
  }
  return json.data as T;
}

// List transactions page 1
const rows = await merchantFetch<{ /* transaction shape */ }[]>("/transactions?page=1&limit=20", {
  method: "GET",
  token: portalAccessToken,
  businessId: selectedBusinessId,
});
```

---

## 6. What is intentionally out of scope

The following are **not** under `/api/v1/merchant` today; use other Core routes (if merchant-safe) or future v1 extensions:

- Global inventory, providers, connect overview, other merchants  
- Invoices, payment links, request links, users/customers listing  
- Platform logs (unless filtered elsewhere)  
- Paystack payout **actions** (may exist on other routes with merchant scope)

---

## 7. Related docs

- **`docs/business-portal-auth.md`** — login, signup, obtaining `accessToken` and `X-Business-Id`.

---

## 8. Quick checklist for the dashboard

1. User logs in → store **`accessToken`**.  
2. **`GET /api/business-auth/session`** → store selected **`businessId`**.  
3. All merchant data screens call **`/api/v1/merchant/...`** with **Bearer + `X-Business-Id`**.  
4. Merchant home / analytics: **`GET /api/v1/merchant/summary`** (`days`, `seriesDays`) for KPIs and charts.  
5. Do **not** call **`/api/connect/*`** for tenant views (platform-only / different permissions).
