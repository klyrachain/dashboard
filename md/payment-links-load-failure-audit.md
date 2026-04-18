# Audit: Payment links not loading (“Unable to load payment links” / “Could not load payment links”)

**Scope:** `dashboard/` + `core/`  
**Date:** 2026-04-18  
**Audience:** Developers debugging why payment link UIs show empty or error states.

---

## 1. Executive summary

The dashboard exposes **two different “payment links” experiences** that call **different backends**:

| User / route | UI entry | Data source | Typical error copy |
|--------------|----------|-------------|---------------------|
| **Merchant** (business portal) | `/payment-links` → `MerchantPaymentLinksClient` | Browser → Next.js **`/api/v1/merchant/pay-pages`** → Core **`GET /api/v1/merchant/pay-pages`** | **“Could not load payment links”** (`merchant-payment-links-client.tsx`) |
| **Platform** (NextAuth admin) | Same path, non-merchant branch | Server → Core **`GET /api/requests`** via `getPaymentLinks()` | **“Unable to load payment links”** (`data-payment-links.ts`) |

Failures are usually **configuration**, **auth/context**, or **upstream Core** — not a single broken React component. Fix by confirming **which branch** you are on, then tracing that branch’s network path end-to-end.

---

## 2. Merchant path (most common for “Could not load payment links”)

### 2.1 Request flow

1. `dashboard/src/app/payment-links/page.tsx` — if `getAccessContext()` returns `type === "merchant"`, it renders `MerchantPaymentLinksClient`.
2. `MerchantPaymentLinksClient` calls RTK Query **`useGetMerchantPayPagesQuery`** (`dashboard/src/store/merchant-api.ts`).
3. `baseQueryWithStatus` (`dashboard/src/store/base-query-with-status.ts`) sends the browser request to **same-origin** `GET /api/v1/merchant/pay-pages?...` with:
   - `Authorization: Bearer <portalJwt>` from Redux `merchantSession.portalJwt`
   - `X-Business-Id` from `activeBusinessId` (or sole business)
   - `x-merchant-environment: TEST | LIVE`
4. `dashboard/src/app/api/v1/merchant/[[...path]]/route.ts` **proxies** to Core:
   - Target: `{NEXT_PUBLIC_CORE_URL}/api/v1/merchant/pay-pages?...`
   - Forwards: `Authorization`, `X-Business-Id`, `x-merchant-environment`, `Accept`, body (non-GET).
5. Core `preHandler` runs **`handleMerchantV1Auth`** for paths under `/api/v1/merchant` (`core/src/server.ts`).
6. Handler: **`GET /pay-pages`** in `core/src/routes/api/v1/merchant-commerce.ts` — `requirePermission(..., PERMISSION_BUSINESS_READ, { allowMerchant: true })`, then Prisma `paymentLink.findMany` scoped by `businessId` + `environment`.

### 2.2 When the UI shows an error vs empty

- **`Could not load payment links`** — `isError` on `useGetMerchantPayPagesQuery` and **not** `FORBIDDEN_MERCHANT_ROLE` (`merchant-payment-links-client.tsx` ~368–381).
- **`Not allowed`** — error code `FORBIDDEN_MERCHANT_ROLE` (different code path; pay-pages GET does **not** call `requireMerchantRole`, so this is more likely from **other** calls on the page, e.g. mutations, or future changes).
- **“Select a business…”** — `activeBusinessId` is missing; query is **skipped** (`skip: !activeBusinessId`) — not a network failure.

### 2.3 Likely root causes (merchant)

| # | Cause | Evidence / where | Fix |
|---|--------|-------------------|-----|
| A | **`NEXT_PUBLIC_CORE_URL` unset** in the **dashboard** Next.js env | Proxy returns **503** `{ success: false, error: "Core API URL not configured" }` (`route.ts` lines 5–20). Only **`NEXT_PUBLIC_CORE_URL`** is read — **`CORE_URL` alone is not used** by this proxy. | Set `NEXT_PUBLIC_CORE_URL` to the Core base (e.g. `http://localhost:4000`) in `.env.local` / deployment env. Restart Next dev server. |
| B | **Core not running** or wrong URL / TLS | Proxy catch returns **502** `{ success: false, error: <message> }`. | Start Core; verify URL/port; if HTTPS self-signed, trust cert in OS/browser. |
| C | **Missing or invalid portal JWT** | Core `handleMerchantV1Auth`: **401** `MERCHANT_UNAUTHORIZED` or `PORTAL_TOKEN_INVALID` (`business-portal-tenant.guard.ts`). | Re-login to business portal; ensure `BUSINESS_PORTAL_JWT_SECRET` (or equivalent) matches between services that mint and verify tokens. |
| D | **Missing / invalid `X-Business-Id`** | Core returns **400** `MISSING_BUSINESS_ID` if header is not a UUID (`business-portal-tenant.guard.ts`). Dashboard should send it from Redux — if header missing, check **`activeBusinessId`** and `base-query-with-status` logic. | Select a business in UI; fix session hydration if `portalJwt` exists but `activeBusinessId` is null. |
| E | **User not a member of the business** | Core **403** `BUSINESS_ACCESS_DENIED`. | Fix `BusinessMember` row in DB or invite user. |
| F | **Wrong merchant environment header** | `resolveMerchantEnvironment` can return **400** with a coded error. | Align TEST/LIVE toggle in dashboard header with Core expectations. |
| G | **Platform admin session hitting merchant API** | Core **403** `MERCHANT_CONTEXT_REQUIRED` — admin session without merchant key / portal JWT (`business-portal-tenant.guard.ts` 33–39). | Use business sign-in flow so Redux has `portalJwt`; do not expect platform NextAuth alone to satisfy `/api/v1/merchant/*`. |

### 2.4 Operational checklist (merchant)

1. Browser DevTools → Network → failing request to **`/api/v1/merchant/pay-pages`**.
2. Note **status** and JSON **`error`** / **`code`**.
3. Confirm **`NEXT_PUBLIC_CORE_URL`** on the **dashboard** process.
4. Confirm Core **`GET /api/v1/merchant/pay-pages`** with same headers via curl/Postman.

---

## 3. Platform path (“Unable to load payment links”)

### 3.1 Request flow

1. `payment-links/page.tsx` — when access is **not** merchant, it calls **`getPaymentLinks()`** server-side.
2. `dashboard/src/lib/data-payment-links.ts` → **`getCoreRequests()`** in `dashboard/src/lib/core-api.ts` → Core **`GET /api/requests`** with **`Authorization: Bearer`** from **`getSessionToken()`** (NextAuth).
3. Important: `coreHeaders()` treats **`api/requests`** as **`requiresBearerForBusinessPath`**. If there is **no** bearer token, it **does not** attach **`x-api-key`** for that path — so the request can go out **effectively unauthenticated** (`core-api.ts` 47–73).
4. Core `GET /api/requests` (`core/src/routes/api/requests.ts`) requires **`requirePermission(..., PERMISSION_CONNECT_TRANSACTIONS)`** with **no** `allowMerchant: true` — so **only platform admin session (with role permissions) or platform API key** with `connect:transactions` — **not** business portal tenant alone.

### 3.2 Likely root causes (platform)

| # | Cause | Fix |
|---|--------|-----|
| P1 | **No NextAuth session / expired** → `getSessionToken()` null → weak or missing auth to Core | Log in as platform admin; refresh session; ensure `NEXTAUTH_SECRET` and Core session validation align. |
| P2 | **Viewer (or role) lacks `connect:transactions`** | Core **403** `FORBIDDEN_PERMISSION`. Grant role permissions or use a platform API key that includes Connect. |
| P3 | **`NEXT_PUBLIC_CORE_URL` / `CORE_URL` missing** on server | `getCoreBaseUrl()` throws or fetch fails — caught as generic error in `getPaymentLinks`. | Configure env vars used by `core-api.ts` (`getCoreBaseUrl`). |
| P4 | **Design gap:** server-side `getPaymentLinks` never uses **`CORE_API_KEY`** for `api/requests` when session is absent | Hardening: either require session for this page or extend `coreHeaders` / `getPaymentLinks` to pass platform key where policy allows. |

### 3.3 Why the string is generic

`data-payment-links.ts` maps any non-OK response or thrown error to **`"Unable to load payment links"`** (or `envelope.error`). The **real** Core message is discarded in the default branch — developers should log **`status`** and raw **`data`** in dev or surface `envelope.error` in the UI for faster diagnosis.

---

## 4. Data model note (merchant “pay pages”)

Merchant list rows are **`PaymentLink`** records in Prisma (`merchant-commerce.ts`), filtered by **`businessId`** and **`MerchantEnvironment`**.

An **empty list with HTTP 200** is **not** an error — it means no rows for that business/environment. That is different from **`isError`** in the client.

---

## 5. Recommended fixes (prioritized)

### 5.1 Configuration (highest impact)

1. **Dashboard:** Set **`NEXT_PUBLIC_CORE_URL`** to the running Core origin (the merchant proxy **does not** read `CORE_URL`).
2. **Core:** Ensure process is up and DB/Redis healthy (`/api/ready`).

### 5.2 Observability

1. **Merchant UI:** On `isError`, show **`error.data.error`** / **`code`** from RTK (and status), not only “Could not load payment links”.
2. **Platform `getPaymentLinks`:** Return or log **`status` + body** when `!ok` so operators see Core’s `UNAUTHORIZED` vs `FORBIDDEN_PERMISSION`.

### 5.3 Auth / product clarity

1. Document that **`/api/v1/merchant/*`** requires **portal JWT + `X-Business-Id`** (or merchant scoped API key), not platform NextAuth alone.
2. Optionally align **`route.ts`** to fall back to **`CORE_URL`** when `NEXT_PUBLIC_CORE_URL` is unset (server-side only), to reduce misconfiguration — **only if** you accept server-only URL for proxy.

### 5.4 Optional `core-api.ts` hardening

For **`api/requests`** when `bearerToken` is missing but **`CORE_API_KEY`** is set, consider attaching **`x-api-key`** for **server-only** dashboard calls (policy decision — do not expose this pattern to the browser).

---

## 6. File reference index

| Area | File |
|------|------|
| Merchant page branch | `dashboard/src/app/payment-links/page.tsx` |
| Merchant client + error UI | `dashboard/src/components/merchant/merchant-payment-links-client.tsx` |
| RTK pay-pages endpoint | `dashboard/src/store/merchant-api.ts` |
| Proxy to Core | `dashboard/src/app/api/v1/merchant/[[...path]]/route.ts` |
| Header injection | `dashboard/src/store/base-query-with-status.ts` |
| Platform list + error string | `dashboard/src/lib/data-payment-links.ts` |
| Core auth for merchant v1 | `core/src/lib/business-portal-tenant.guard.ts` |
| Core GET pay-pages | `core/src/routes/api/v1/merchant-commerce.ts` |
| Core GET requests (platform) | `core/src/routes/api/requests.ts` |
| Core global auth hook | `core/src/server.ts` (`preHandler`) |

---

## 7. Conclusion

**“Payment links not showing”** is almost never a single CSS or table bug: it is the **end-to-end contract** between dashboard env (`NEXT_PUBLIC_CORE_URL`), **merchant session headers** (JWT + business UUID + environment), and Core **auth + Prisma filters**. Start from **Network tab** on `/api/v1/merchant/pay-pages` (merchant) or server logs for **`GET /api/requests`** (platform), map HTTP status to the table above, then apply the matching fix.
