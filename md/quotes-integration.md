# Quotes Page Integration (Swap Quotes)

This doc describes how the **Connect → Quotes** page integrates with two backends: the **chains/tokens backend** (`BACKEND_URL`) and the **quote API** (Core, `NEXT_PUBLIC_CORE_URL`). Swap quotes **must** use **chain ID** and **token contract address**; chain names or token symbols alone are not accepted by the quote API.

---

## Two backends

| Backend | Env | Purpose |
|--------|-----|--------|
| **Chains/tokens** | `BACKEND_URL` | GET `/api/squid/chains`, GET `/api/squid/tokens` — canonical list of chains and tokens (chainId, address, symbol). Used to **resolve** pair symbols/chain names to chain IDs and token addresses. |
| **Quote API** | `NEXT_PUBLIC_CORE_URL` (Core) | POST `/api/quote/swap`, POST `/api/quote/best` — swap quotes. **Requires** `from_chain`/`to_chain` as **numbers** (chain ID) and `from_token`/`to_token` as **contract addresses**. |

---

## Swap quote API (Core)

- **POST /api/quote/swap** — Single provider: `provider` in body is `0x`, `squid`, or `lifi`. Body: `from_token`, `to_token` (addresses), `amount` (wei string), `from_chain`, `to_chain` (numbers), `from_address` (required for squid/lifi).
- **POST /api/quote/best** — No `provider` in body; backend calls all applicable providers and returns best (and optional alternative) quote.

**Important:** If you send chain **name** or token **symbol** instead of chain ID and token address, the quote API will not work correctly. The quote backend is designed to work with chain IDs and token addresses only.

See [quote-api.md](./quote-api.md) for full request/response shapes.

---

## Flow on the Quotes page

1. **Chains and tokens** — Fetched from `BACKEND_URL`: GET `/api/squid/chains`, GET `/api/squid/tokens`. These give `chainId`, `networkName`, token `address`, `symbol`, `decimals`, etc.
2. **Most-traded pairs** — Raw pair list (from/to token symbol + chain name) comes from **Core** transactions: GET `/api/transactions`; we count `(fromChain, fromToken, toChain, toToken)` and take top N. If Core is unavailable or returns few pairs, we use fallback pairs (e.g. USDC/ETH on Base).
3. **Transformer** — A transformer service takes:
   - Chains and tokens from the **chains/tokens backend**
   - Raw pairs (symbol + chain name) from step 2  
   and produces **resolved pairs**: each pair has `fromChainId`, `toChainId`, `fromAddress`, `toAddress` (and display `fromToken`/`toToken` symbols, `label`, `count`). Only pairs where both tokens can be resolved to an address on the correct chain are included.
4. **Quote requests** — For each resolved pair we call the **quote API** (Core): POST `/api/quote/swap` with a chosen `provider` (or POST `/api/quote/best`). We pass `from_chain`/`to_chain` as chain IDs and `from_token`/`to_token` as contract addresses. We throttle requests (e.g. sequential with a short delay) to avoid "too many requests" from the quote backend.
5. **Provider selection** — The UI can let the user pick a single provider (`0x`, `squid`, `lifi`) or "best". Single provider uses POST `/api/quote/swap`; "best" uses POST `/api/quote/best`.

---

## Fiat (onramp/offramp) vs swap

- **Swap quotes** — Token↔token (same or cross-chain). Use chain ID + token address; chains/tokens from `BACKEND_URL`; quote from Core `/api/quote/swap` or `/api/quote/best`.
- **Fiat (onramp/offramp)** — Fiat↔crypto. See [onramp-quote-api.md](./onramp-quote-api.md). The onramp API may accept token **symbol** or **address** for pool tokens (Base/Ethereum); for other tokens it uses contract address. That flow is separate from the swap-quotes “most traded pairs” section.

---

## Response format (connect quotes action)

The **quote backend** (Core) returns plain JSON, e.g.:

```json
{ "success": true, "data": { "from_amount": "1000000000000000000", "to_amount": "2690627918", ... } }
```

The **Connect Quotes** page calls a **Next.js Server Action** (`getQuotesAction`) which calls the quote backend and returns `QuoteResult[]`. What you see in the browser **Network** tab (e.g. `:N...`, `0:{"a":"$@1",...}`, `1:D{...}`, `2:T10aa,...`, `97177f1df9bde71d8759c633eb6f8a2b11:[{"pair":"$T0:0:0",...}]`) is **Next.js** serializing the server action result for the RSC payload (with `$T0:0:0`, `$2`, etc. as references). The **quote backend** is not returning that format; our server receives normal JSON from Core and returns normal objects; Next.js then encodes them for the client. The client receives **deserialized** data, so components get proper `QuoteResult` objects with `pair`, `ok`, `data`, `error`. If we need a stable, explicit contract for the frontend, we can add a small transformer in the action that maps each `QuoteResult` to a normalized shape (e.g. same fields plus optional `rateHuman`) before returning.

---

## Summary

- **Chains/tokens** → from `BACKEND_URL` (GET `/api/squid/chains`, GET `/api/squid/tokens`).
- **Pair ideas** → from Core transactions (or fallback list).
- **Transformer** → maps (symbol, chain name) to (chainId, token address) using backend chains/tokens.
- **Swap quote** → Core POST `/api/quote/swap` or `/api/quote/best` with **chain IDs** and **token addresses** only; throttle requests to avoid rate limits.
