# Core Server — Invoices API Specification

**Purpose:** Endpoint specification for the Core server to support the dashboard invoice feature.  
**Use:** Implement these endpoints in Core so the dashboard can replace mock data with real API calls.  
**Currency:** All amounts are in **USD**.

---

## 1. Overview

The dashboard currently uses an in-memory store for invoices. When Core implements these endpoints, the dashboard will call them instead. All list endpoints should support pagination (`?page=1&limit=20`, default limit 20, max 100). Responses should use the envelope:

```json
{
  "success": true,
  "data": { ... } | [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 150 }
}
```

---

## 2. Data Types

### 2.1 Invoice status

`"Paid"` | `"Pending"` | `"Overdue"` | `"Draft"` | `"Cancelled"`

### 2.2 Line item

| Field         | Type     | Description        |
|---------------|----------|--------------------|
| `id`          | `string` | Unique ID          |
| `productName` | `string` | Product/service    |
| `qty`         | `number` | Quantity           |
| `unitPrice`   | `number` | USD per unit       |
| `amount`      | `number` | USD total (qty × unitPrice) |

### 2.3 Log entry

| Field         | Type   | Description     |
|---------------|--------|-----------------|
| `id`          | `string` | Unique ID     |
| `description` | `string` | Human-readable event |
| `date`        | `string` | ISO 8601      |

### 2.4 Invoice (full)

| Field               | Type     | Description                          |
|---------------------|----------|--------------------------------------|
| `id`                | `string` | Unique ID                            |
| `invoiceNumber`     | `string` | Human-readable number (e.g. INV4257-09-011) |
| `status`            | `InvoiceStatus` | See §2.1                    |
| `amount`            | `number` | Total amount (USD)                   |
| `currency`          | `string` | `"USD"`                              |
| `currencyLabel`     | `string` | Optional, e.g. "USD - US Dollar"    |
| `paidAt`            | `string \| null` | ISO 8601 when paid            |
| `batchTitle`        | `string` | Section title (e.g. "Payment batch January 2026") |
| `billedTo`          | `string` | Customer email                       |
| `billingDetails`    | `string` | Customer name                        |
| `subject`           | `string` | Invoice subject                      |
| `issued`            | `string` | ISO 8601 issued date                 |
| `dueDate`           | `string` | ISO 8601 due date                    |
| `notes`             | `string \| null` | Optional notes                 |
| `lineItems`        | `LineItem[]` | See §2.2                      |
| `subtotal`          | `number` | Sum of line items (USD)              |
| `discountPercent`   | `number` | 0–100                                |
| `discountAmount`    | `number` | USD                                  |
| `total`             | `number` | subtotal - discountAmount (USD)      |
| `amountDue`         | `number` | Same as total for unpaid             |
| `termsAndConditions`| `string` | Terms text                           |
| `notesContent`      | `string` | Internal notes                       |
| `log`               | `LogEntry[]` | Audit log, newest first        |

### 2.5 Invoice list item

| Field           | Type     |
|-----------------|----------|
| `id`            | `string` |
| `invoiceNumber`| `string` |
| `status`        | `InvoiceStatus` |
| `amount`        | `number` |
| `currency`      | `string` |
| `customer`      | `string` (billedTo) |
| `issued`        | `string` (ISO 8601) |
| `dueDate`       | `string` (ISO 8601) |
| `paidAt`        | `string \| null` (ISO 8601) |

---

## 3. Endpoints

### 3.1 List invoices

| Method | Path | Description |
|--------|------|--------------|
| `GET`  | `/api/invoices` | List invoices (paginated). |

**Query (optional):**

| Param  | Type   | Description        |
|--------|--------|--------------------|
| `page` | number | Default 1          |
| `limit`| number | Default 20, max 100 |
| `status` | string | Filter by status |

**Response:** `200 OK`  
- `data`: array of **Invoice list item** (§2.5)  
- `meta`: `{ page, limit, total }`

---

### 3.2 Get invoice by ID

| Method | Path | Description |
|--------|------|--------------|
| `GET`  | `/api/invoices/:id` | Get full invoice. |

**Response:** `200 OK`  
- `data`: **Invoice** (§2.4)

**Errors:**  
- `404 Not Found` — invoice not found

---

### 3.3 Create / send invoice

| Method | Path | Description |
|--------|------|--------------|
| `POST` | `/api/invoices` | Create a new invoice and optionally send to customer. |

**Request body (JSON):**

| Field         | Type     | Required | Description        |
|---------------|----------|----------|--------------------|
| `billedTo`    | `string` | Yes      | Customer email     |
| `billingDetails` | `string` | No    | Customer name      |
| `subject`     | `string` | Yes      | Invoice subject    |
| `dueDate`     | `string` | Yes      | ISO 8601 due date  |
| `lineItems`   | `LineItem[]` | Yes  | At least one item  |
| `discountPercent` | `number` | No   | 0–100, default 0   |
| `termsAndConditions` | `string` | No | Terms text    |
| `notesContent`| `string` | No       | Internal notes     |
| `sendNow`     | `boolean`| No       | If true, send to billedTo immediately |

**Response:** `201 Created`  
- `data`: **Invoice** (§2.4) (with generated `id`, `invoiceNumber`, `issued`, `log`)

**Errors:**  
- `400 Bad Request` — validation failure (missing required, invalid dates, etc.)

---

### 3.4 Update invoice

| Method | Path | Description |
|--------|------|--------------|
| `PATCH` | `/api/invoices/:id` | Partial update. |

**Request body (JSON):** All fields optional.

| Field         | Type     | Description        |
|---------------|----------|--------------------|
| `subject`     | `string` |                    |
| `dueDate`     | `string` | ISO 8601           |
| `notes`       | `string \| null` | |
| `notesContent`| `string` |                    |
| `billedTo`    | `string` |                    |
| `billingDetails` | `string` |                |
| `termsAndConditions` | `string` |            |
| `lineItems`   | `LineItem[]` | Recompute subtotal/discount/total |

**Response:** `200 OK`  
- `data`: **Invoice** (§2.4) (updated)

**Errors:**  
- `400 Bad Request` — validation  
- `404 Not Found` — invoice not found  
- `409 Conflict` — invoice not editable (e.g. already Paid or Cancelled)

---

### 3.5 Send invoice (resend)

| Method | Path | Description |
|--------|------|--------------|
| `POST` | `/api/invoices/:id/send` | Send (or resend) invoice to customer. |

**Request body (JSON):**

| Field   | Type   | Required | Description        |
|---------|--------|----------|--------------------|
| `toEmail` | `string` | No     | Override recipient; default `billedTo` |

**Response:** `200 OK`  
- `data`: `{ sent: true, to: "customer@example.com" }`  
- Server should append a log entry: "Invoice was sent to …"

**Errors:**  
- `404 Not Found`  
- `400 Bad Request` — e.g. invoice Cancelled

---

### 3.6 Duplicate invoice

| Method | Path | Description |
|--------|------|--------------|
| `POST` | `/api/invoices/:id/duplicate` | Create a copy as Draft with new id and invoiceNumber. |

**Request body:** None (or empty `{}`).

**Response:** `201 Created`  
- `data`: **Invoice** (§2.4) (new invoice; `status: "Draft"`, new `id`, `invoiceNumber`, `issued`, `dueDate`, single log "Invoice was created (duplicate).")

**Errors:**  
- `404 Not Found`

---

### 3.7 Mark invoice as paid

| Method | Path | Description |
|--------|------|--------------|
| `POST` | `/api/invoices/:id/mark-paid` | Set status to Paid and set paidAt to now. |

**Request body:** None (or empty `{}`).

**Response:** `200 OK`  
- `data`: **Invoice** (§2.4) (updated; append log "Invoice was marked as paid.")

**Errors:**  
- `404 Not Found`  
- `400 Bad Request` — e.g. already Paid or Cancelled

---

### 3.8 Cancel invoice

| Method | Path | Description |
|--------|------|--------------|
| `POST` | `/api/invoices/:id/cancel` | Set status to Cancelled. |

**Request body:** None (or empty `{}`).

**Response:** `200 OK`  
- `data`: **Invoice** (§2.4) (updated; append log "Invoice was cancelled.")

**Errors:**  
- `404 Not Found`  
- `400 Bad Request` — e.g. already Paid or Cancelled

---

### 3.9 Export invoice (optional)

| Method | Path | Description |
|--------|------|--------------|
| `GET`  | `/api/invoices/:id/export` | Return invoice as CSV or PDF for download. |

**Query:**

| Param   | Type   | Description        |
|---------|--------|--------------------|
| `format`| string | `csv` (default) or `pdf` |

**Response:**  
- CSV: `200 OK`, `Content-Type: text/csv`, `Content-Disposition: attachment; filename="invoice-INV4257-09-011.csv"`  
- PDF: `200 OK`, `Content-Type: application/pdf`, same disposition with `.pdf`

**Errors:**  
- `404 Not Found`

*Note:* The dashboard currently exports CSV client-side from the loaded invoice. This endpoint is optional if Core wants to generate exports server-side.

---

## 4. Dashboard integration notes

- **Auth:** Dashboard uses `x-api-key` (same as other Core API calls).  
- **Base URL:** From `CORE_API_KEY` / Core base URL env.  
- **Replace mock:** In `src/lib/data-invoices.ts`, replace `invoiceStore` and helpers with `fetch` calls to the above endpoints.  
- **Serialization:** Dashboard expects dates as ISO 8601 strings in JSON; no special handling needed if Core returns ISO strings.

---

## 5. Changelog

| Date       | Change |
|------------|--------|
| 2026-01-30 | Initial spec: list, get, create, update, send, duplicate, mark-paid, cancel, export. |
