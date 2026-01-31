"use client";

import { useState } from "react";
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
import { getOnrampQuoteAction } from "@/app/connect/quotes/actions";
import type { OnrampQuoteResult } from "@/lib/data-onramp-quote";

const COUNTRIES = [
  { value: "GH", label: "Ghana (GHS)" },
  { value: "NG", label: "Nigeria (NGN)" },
  { value: "KE", label: "Kenya (KES)" },
  { value: "ZA", label: "South Africa (ZAR)" },
];

const CHAINS = [
  { value: "8453", label: "Base (8453)" },
  { value: "1", label: "Ethereum (1)" },
  { value: "137", label: "Polygon (137)" },
];

export function OnrampQuoteSection() {
  const [country, setCountry] = useState("GH");
  const [chainId, setChainId] = useState(8453);
  const [token, setToken] = useState("USDC");
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
            <Select
              value={String(chainId)}
              onValueChange={(v) => setChainId(Number(v))}
            >
              <SelectTrigger id="onramp-chain">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAINS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="onramp-token">Token (symbol or address)</Label>
            <Input
              id="onramp-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="USDC or 0x..."
            />
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
