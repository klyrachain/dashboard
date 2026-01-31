"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getOnrampQuoteAction } from "@/app/connect/quotes/actions";
import type { OnrampQuoteResult } from "@/lib/data-onramp-quote";
import type { BackendChain, BackendToken } from "@/lib/backend-api";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Truncate long text (e.g. token names) to a reasonable length. */
function truncateLabel(text: string, maxLen: number = 35): string {
  const t = (text || "").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "…";
}

const COUNTRIES = [
  { value: "GH", label: "Ghana (GHS)" },
  { value: "NG", label: "Nigeria (NGN)" },
  { value: "KE", label: "Kenya (KES)" },
  { value: "ZA", label: "South Africa (ZAR)" },
];

const FALLBACK_CHAINS = [
  { value: "8453", label: "Base (8453)" },
  { value: "1", label: "Ethereum (1)" },
  { value: "137", label: "Polygon (137)" },
];

type OnrampQuoteSectionProps = {
  chains?: BackendChain[];
  tokens?: BackendToken[];
};

export function OnrampQuoteSection({ chains = [], tokens = [] }: OnrampQuoteSectionProps) {
  const chainOptions = useMemo(() => {
    const list =
      chains.length > 0
        ? chains.map((c) => ({ value: String(c.chainId), label: `${c.networkName} (${c.chainId})` }))
        : FALLBACK_CHAINS;
    return [...list].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [chains]);

  const [country, setCountry] = useState("GH");
  const [chainId, setChainId] = useState(() => {
    const first = chainOptions[0]?.value;
    return first ? Number(first) : 8453;
  });
  const [chainSearch, setChainSearch] = useState("");
  const [chainOpen, setChainOpen] = useState(false);
  const filteredChainOptions = useMemo(() => {
    const q = chainSearch.trim().toLowerCase();
    if (!q) return chainOptions;
    return chainOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [chainOptions, chainSearch]);

  const tokensOnChain = useMemo(
    () => tokens.filter((t) => Number(t.chainId) === chainId),
    [tokens, chainId]
  );
  const tokenOptions = useMemo(() => {
    const seen = new Set<string>();
    const list = tokensOnChain
      .filter((t) => {
        const s = (t.symbol || "").toUpperCase();
        if (!s || seen.has(s)) return false;
        seen.add(s);
        return true;
      })
      .map((t) => ({
        value: t.symbol,
        label: `${t.symbol} (${truncateLabel(t.name || t.address.slice(0, 8), 35)})`,
      }));
    return [...list].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [tokensOnChain]);
  const [tokenSearch, setTokenSearch] = useState("");
  const [tokenOpen, setTokenOpen] = useState(false);
  const filteredTokenOptions = useMemo(() => {
    const q = tokenSearch.trim().toLowerCase();
    if (!q) return tokenOptions;
    return tokenOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [tokenOptions, tokenSearch]);
  const [token, setToken] = useState("USDC");
  useEffect(() => {
    if (tokenOptions.length > 0 && !tokenOptions.some((t) => t.value === token)) {
      setToken(tokenOptions[0].value);
    }
  }, [chainId, tokenOptions, token]);
  const [amount, setAmount] = useState("100");
  const [amountIn, setAmountIn] = useState<"fiat" | "crypto">("fiat");
  const [purchaseMethod, setPurchaseMethod] = useState<"buy" | "sell">("buy");
  const [fromAddress, setFromAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OnrampQuoteResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const num = parseFloat(amount);
      if (Number.isNaN(num) || num <= 0) {
        setResult({ ok: false, error: "Enter a valid amount." });
        return;
      }
      const data = await getOnrampQuoteAction({
        country,
        chain_id: chainId,
        token: token.trim(),
        amount: num,
        amount_in: amountIn,
        purchase_method: purchaseMethod,
        from_address: fromAddress.trim() || undefined,
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white font-tertiary">
      <CardHeader>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Fiat ↔ Crypto (onramp / offramp)
        </h2>
        <p className="text-sm text-slate-500">
          Get a quote for buying or selling crypto with fiat (Fonbnk). Use symbol (e.g. USDC) or token address.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="onramp-country">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="onramp-country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="onramp-chain">Chain</Label>
            <Popover open={chainOpen} onOpenChange={setChainOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="onramp-chain"
                  variant="outline"
                  role="combobox"
                  className="h-9 w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {chainOptions.find((c) => c.value === String(chainId))?.label ?? "Chain"}
                  </span>
                  <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popper-anchor-width)] min-w-[8rem] max-w-[280px] p-0" align="start">
                <div className="p-2 border-b border-slate-100">
                  <Input
                    placeholder="Search chains…"
                    value={chainSearch}
                    onChange={(e) => setChainSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="max-h-[280px] overflow-y-auto p-1">
                  {filteredChainOptions.length > 0 ? (
                    filteredChainOptions.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={cn(
                          "flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                          c.value === String(chainId) && "bg-accent"
                        )}
                        onClick={() => {
                          setChainId(Number(c.value));
                          setChainSearch("");
                          setChainOpen(false);
                        }}
                      >
                        <span className="truncate">{c.label}</span>
                      </button>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-slate-500">No chain found</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="onramp-token">Token (symbol or address)</Label>
            {tokens.length > 0 ? (
              <Popover open={tokenOpen} onOpenChange={setTokenOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="onramp-token"
                    variant="outline"
                    role="combobox"
                    className="h-9 w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {tokenOptions.find((t) => t.value === token)?.label ?? token ?? "Token"}
                    </span>
                    <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popper-anchor-width)] min-w-[8rem] max-w-[280px] p-0" align="start">
                  <div className="p-2 border-b border-slate-100">
                    <Input
                      placeholder="Search tokens…"
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="max-h-[280px] overflow-y-auto p-1">
                    {filteredTokenOptions.length > 0 ? (
                      filteredTokenOptions.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          className={cn(
                            "flex w-full cursor-pointer items-center rounded-sm py-1.5 pl-2 pr-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            t.value === token && "bg-accent"
                          )}
                          onClick={() => {
                            setToken(t.value);
                            setTokenSearch("");
                            setTokenOpen(false);
                          }}
                        >
                          <span className="truncate" title={t.label}>
                            {t.label}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="py-4 text-center text-sm text-slate-500">
                        {tokenOptions.length === 0 ? "No tokens on this chain" : "No token found"}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                id="onramp-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="USDC or 0x..."
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="onramp-amount">Amount</Label>
            <Input
              id="onramp-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={amountIn === "fiat" ? "e.g. 100" : "e.g. 10"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onramp-amount-in">Amount in</Label>
            <Select
              value={amountIn}
              onValueChange={(v) => setAmountIn(v as "fiat" | "crypto")}
            >
              <SelectTrigger id="onramp-amount-in">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fiat">Fiat (I pay this much fiat)</SelectItem>
                <SelectItem value="crypto">Crypto (I want this much crypto)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="onramp-method">Purchase method</Label>
            <Select
              value={purchaseMethod}
              onValueChange={(v) => setPurchaseMethod(v as "buy" | "sell")}
            >
              <SelectTrigger id="onramp-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy (onramp)</SelectItem>
                <SelectItem value="sell">Sell (offramp)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="onramp-from-address">From address (optional)</Label>
            <Input
              id="onramp-from-address"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="0x... (for swap routing when token not in pool)"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Getting quote…" : "Get quote"}
            </Button>
          </div>
        </form>

        {result && (
          <div
            className={`rounded-lg border p-4 font-secondary text-sm ${
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {result.ok && result.data ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Currency</dt>
                  <dd className="font-medium">{result.data.currency}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Rate</dt>
                  <dd className="font-medium">{result.data.rate}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fee</dt>
                  <dd className="font-medium">{result.data.fee}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total crypto</dt>
                  <dd className="font-medium tabular-nums">
                    {result.data.total_crypto} {result.data.token_symbol ?? ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total fiat</dt>
                  <dd className="font-medium tabular-nums">
                    {result.data.total_fiat} {result.data.currency}
                  </dd>
                </div>
                {result.data.swap && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Swap (pool → token)</dt>
                    <dd className="text-xs text-slate-600 mt-1">
                      {result.data.swap.provider} — {result.data.swap.from_amount} → {result.data.swap.to_amount}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p>{result.error ?? "Quote failed."}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
