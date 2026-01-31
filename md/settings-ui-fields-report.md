# Platform Settings UI — Fields Report for Core Server

**Purpose:** Reference for updating the Core server to support the Platform Settings control panel. The dashboard UI is implemented; this document lists every field so Core can expose matching GET/PATCH (or equivalent) endpoints and persistence.

**Dashboard routes:** `/settings/general`, `/settings/financials`, `/settings/providers`, `/settings/risk`, `/settings/team`, `/settings/api`.

---

## 1. General (`/settings/general`)

| Field key (suggested) | Label in UI | Type | Validation / constraints | Description |
|------------------------|-------------|------|---------------------------|-------------|
| `publicName` | Public name | `string` | Non-empty, max length e.g. 100 | Platform name used in emails and public copy (e.g. "MyCryptoApp"). |
| `supportEmail` | Support email | `string` | Valid email | Where user replies go. |
| `supportPhone` | Support phone (optional) | `string` | Optional; E.164 or freeform | Optional support phone. |
| `defaultCurrency` | Default currency | `string` | Enum: `USD`, `USDC`, `GHS` | Default currency for the platform. |
| `timezone` | Timezone | `string` | IANA timezone (e.g. `Africa/Accra`, `America/New_York`, `UTC`) | Default timezone. |
| `maintenanceMode` | Enable maintenance mode | `boolean` | — | When `true`, block all new `POST /order` requests at the API gateway. |

**Suggested Core API:**  
- `GET /api/settings/general` → `{ success, data: { publicName, supportEmail, supportPhone?, defaultCurrency, timezone, maintenanceMode } }`  
- `PATCH /api/settings/general` → body: same fields (all optional); response: updated object.

---

## 2. Financials (`/settings/financials`)

| Field key (suggested) | Label in UI | Type | Validation / constraints | Description |
|------------------------|-------------|------|---------------------------|-------------|
| `baseFeePercent` | Base platform fee (%) | `number` | 0–100, e.g. 2 decimal places | Default platform fee percentage. Applied when merchant has no custom FeeSchedule. |
| `fixedFee` | Fixed fee ($) | `number` | ≥ 0 | Default fixed fee in default currency. |
| `minTransactionSize` | Min transaction size ($) | `number` | ≥ 0 | Minimum transaction size; avoids dust. |
| `maxTransactionSize` | Max transaction size ($) | `number` | ≥ minTransactionSize | Maximum transaction size; limits risk exposure. |
| `lowBalanceAlert` | Low balance alert ($) | `number` | ≥ 0 | Threshold below which to send Slack/email alerts to admins (inventory/wallet). |

**Suggested Core API:**  
- `GET /api/settings/financials` → `{ success, data: { baseFeePercent, fixedFee, minTransactionSize, maxTransactionSize, lowBalanceAlert } }`  
- `PATCH /api/settings/financials` → body: same fields (all optional); response: updated object.

---

## 3. Providers & Routing (`/settings/providers`)

### 3.1 Global slippage

| Field key (suggested) | Label in UI | Type | Validation / constraints | Description |
|------------------------|-------------|------|---------------------------|-------------|
| `maxSlippagePercent` | Max allowed slippage | `number` | e.g. 0.1–10, 1 decimal | Max allowed slippage for swap routing (e.g. 0.5% or 1.0%). |

### 3.2 Per-provider configuration

Providers in UI: **SQUID**, **LIFI**, **0X**, **PAYSTACK**. Each provider has:

| Field key (per provider) | Label in UI | Type | Validation / constraints | Description |
|---------------------------|-------------|------|---------------------------|-------------|
| `id` | — | `string` | Enum: `SQUID`, `LIFI`, `0X`, `PAYSTACK` | Provider identifier. |
| `enabled` | Enabled | `boolean` | — | If `false`, system stops routing to this provider (e.g. when it is down). |
| `priority` | Priority | `number` | 1–10 (or 1–N) | Routing order: try lower number first (e.g. 1 = Squid, 2 = LiFi). |
| `apiKey` | API key | `string` | Secret; never returned in full in GET | API key for the provider. GET returns masked only (e.g. `sk_live_••••••••`). |
| `status` | Status | `string` | Read-only from Core: `operational`, `degraded`, `down` | Provider health (Core may compute from health checks). |
| `latencyMs` | Latency (avg) | `number` \| `null` | Read-only; optional | Average latency in ms (Core may compute from metrics). |

**Suggested Core API:**  
- `GET /api/settings/providers` → `{ success, data: { maxSlippagePercent, providers: [{ id, enabled, priority, apiKeyMasked, status?, latencyMs? }] } }`.  
- `PATCH /api/settings/providers` → body: `{ maxSlippagePercent?, providers?: [{ id, enabled?, priority? }] }` (no raw API keys in PATCH; use separate endpoint to set key if needed).  
- Optional: `PUT /api/settings/providers/:id/key` or `PATCH /api/settings/providers/:id` with `apiKey` to set/rotate provider API key.

---

## 4. Risk & Compliance (`/settings/risk`)

| Field key (suggested) | Label in UI | Type | Validation / constraints | Description |
|------------------------|-------------|------|---------------------------|-------------|
| `enforceKycOver1000` | Enforce KYC for > $1000 | `boolean` | — | When `true`, enforce KYC for transactions above $1000. |
| `blockHighRiskIp` | Block high-risk IP addresses | `boolean` | — | When `true`, block high-risk IPs (e.g. via Cloudflare or internal logic). |
| `blacklist` | Banned addresses or domains | `string` | Multiline; one entry per line; trim empty lines | Global blacklist: wallet addresses or domains. Any transaction involving these is auto-rejected. Stored as array of strings server-side. |

**Suggested Core API:**  
- `GET /api/settings/risk` → `{ success, data: { enforceKycOver1000, blockHighRiskIp, blacklist: string[] } }` (blacklist as array).  
- `PATCH /api/settings/risk` → body: `{ enforceKycOver1000?, blockHighRiskIp?, blacklist?: string[] }`; accept array or newline-separated string and normalize to array.

---

## 5. Team (`/settings/team`)

### 5.1 Admin list (read)

| Field (response) | Shown in UI | Type | Description |
|------------------|-------------|------|-------------|
| `name` | Name | `string` | Admin display name. |
| `email` | Email | `string` | Admin email. |
| `role` | Role | `string` | Enum: `super_admin`, `support`, `developer`, `viewer`. |
| `twoFaEnabled` | 2FA | `boolean` | Whether 2FA is enabled for this admin. |

**Role semantics (for Core):**  
- **Super Admin:** Can change fees and payout keys.  
- **Support Agent:** Can view transactions but cannot refund or change settings.  
- **Developer:** Can view Logs and API keys only.  
- **Viewer:** Read-only access.

### 5.2 Invite new admin (write)

| Field key (suggested) | Label in UI | Type | Validation / constraints | Description |
|------------------------|-------------|------|---------------------------|-------------|
| `email` | Email | `string` | Valid email | Email to send invite to. |
| `role` | Role | `string` | Enum: `super_admin`, `support`, `developer`, `viewer` | Role assigned to the invited admin. |

**Suggested Core API:**  
- `GET /api/settings/team/admins` → `{ success, data: [{ id, name, email, role, twoFaEnabled }], meta? }`.  
- `POST /api/settings/team/invite` → body: `{ email, role }`; response: `{ success, data: { invited: true, email } }` (Core sends email or returns invite link).

---

## 6. API & Webhooks (`/settings/api`)

| Field key (suggested) | Label in UI | Type | Validation / constraints | Description |
|------------------------|-------------|------|---------------------------|-------------|
| `webhookSigningSecret` | Webhook signing secret | `string` | Secret; never returned in full | Secret used to sign webhooks sent to merchants. GET returns masked only (e.g. `whsec_••••••••`). |
| `slackWebhookUrl` | Slack webhook URL | `string` | Optional; valid URL | Internal Slack webhook for alerts (e.g. "New high value order", "Server down"). |
| `alertEmails` | Alert email list | `string` | Optional; comma-separated emails | Dev/ops emails for internal alerts. Stored as string or array server-side. |

**Actions:**  
- **Rotate secret:** Core should provide `POST /api/settings/api/rotate-webhook-secret` (or similar). New secret is generated; old one invalidated. Merchants must update verification.

**Suggested Core API:**  
- `GET /api/settings/api` → `{ success, data: { webhookSigningSecretMasked, slackWebhookUrl?, alertEmails? } }`.  
- `PATCH /api/settings/api` → body: `{ slackWebhookUrl?, alertEmails? }` (no raw secret in PATCH).  
- `POST /api/settings/api/rotate-webhook-secret` → `{ success, data: { webhookSigningSecretMasked } }` (new secret; full value only in response once if at all, then only masked in GET).

---

## 7. Summary: Suggested Core Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/settings/general` | Get general settings (profile, locale, maintenance). |
| `PATCH` | `/api/settings/general` | Update general settings. |
| `GET` | `/api/settings/financials` | Get fee schedule, limits, liquidity threshold. |
| `PATCH` | `/api/settings/financials` | Update financials. |
| `GET` | `/api/settings/providers` | Get provider list + max slippage (keys masked). |
| `PATCH` | `/api/settings/providers` | Update enabled, priority, maxSlippage. |
| `GET` | `/api/settings/risk` | Get KYC flags and blacklist. |
| `PATCH` | `/api/settings/risk` | Update risk settings. |
| `GET` | `/api/settings/team/admins` | List admins (name, email, role, 2FA). |
| `POST` | `/api/settings/team/invite` | Invite admin (email, role). |
| `GET` | `/api/settings/api` | Get webhook secret (masked), Slack URL, alert emails. |
| `PATCH` | `/api/settings/api` | Update Slack URL, alert emails. |
| `POST` | `/api/settings/api/rotate-webhook-secret` | Rotate webhook signing secret. |

All settings endpoints should require **platform admin** (e.g. `GET /api/access` → `type: "platform"` and appropriate permission). Use `x-api-key` and return 401/403 for non-platform or insufficient permissions.

---

## 8. UI state vs backend

- **Current UI:** All fields are client-side state only; "Save changes" / "Send invite" / "Rotate secret" do not call Core yet.  
- **After Core support:** Dashboard will call the GET endpoints on load (per tab or once for all settings) and PATCH/POST on save.  
- **Secrets:** API keys and webhook signing secret are never shown in full in the UI; Core should return only masked values in GET and accept full values only in secure write endpoints (e.g. set provider key, rotate secret).
