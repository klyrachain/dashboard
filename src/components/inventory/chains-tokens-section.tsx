"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ChainRow, TokenRow } from "@/lib/data-lots-chains";

type ChainsTokensSectionProps = {
  chains: ChainRow[];
  tokens: TokenRow[];
  /** When true, smaller headers and table text for overview. */
  compact?: boolean;
};

export function ChainsTokensSection({ chains, tokens, compact }: ChainsTokensSectionProps) {
  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {!compact && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Chains & tokens</h2>
          <p className="text-sm text-muted-foreground">
            Supported chains and tokens (public). Filter tokens by chain in the table.
          </p>
        </div>
      )}
      <div className={compact ? "grid gap-3 lg:grid-cols-2" : "grid gap-6 lg:grid-cols-2"}>
        <Card className="bg-white">
          <CardHeader className={compact ? "pb-2 pt-3 px-3" : undefined}>
            <CardTitle className={compact ? "text-xs font-medium text-muted-foreground" : "text-base"}>
              Chains
            </CardTitle>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                {chains.length} chain{chains.length !== 1 ? "s" : ""}
              </p>
            )}
          </CardHeader>
          <CardContent className={compact ? "px-3 pb-3 pt-0" : undefined}>
            {chains.length === 0 ? (
              <div className={compact ? "py-4 text-center text-xs text-slate-500" : "py-8 text-center text-sm text-slate-500"}>
                No chains
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 text-left text-muted-foreground">
                    <TableHead className={compact ? "text-xs" : undefined}>Chain ID</TableHead>
                    <TableHead className={compact ? "text-xs" : undefined}>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chains.map((chain) => (
                    <TableRow key={chain.chainId} className="border-b border-slate-100">
                      <TableCell className={compact ? "font-mono text-xs py-1.5" : "font-mono text-sm"}>{chain.chainId}</TableCell>
                      <TableCell className={compact ? "text-xs font-medium py-1.5" : "font-medium"}>{chain.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className={compact ? "pb-2 pt-3 px-3" : undefined}>
            <CardTitle className={compact ? "text-xs font-medium text-muted-foreground" : "text-base"}>
              Tokens
            </CardTitle>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                {tokens.length} token{tokens.length !== 1 ? "s" : ""}
              </p>
            )}
          </CardHeader>
          <CardContent className={compact ? "px-3 pb-3 pt-0" : undefined}>
            {tokens.length === 0 ? (
              <div className={compact ? "py-4 text-center text-xs text-slate-500" : "py-8 text-center text-sm text-slate-500"}>
                No tokens
              </div>
            ) : (
              <div className={compact ? "max-h-[200px] overflow-y-auto" : "max-h-[320px] overflow-y-auto"}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 text-left text-muted-foreground">
                      <TableHead className={compact ? "text-xs" : undefined}>Chain ID</TableHead>
                      <TableHead className={compact ? "text-xs" : undefined}>Symbol</TableHead>
                      <TableHead className={compact ? "max-w-[120px] truncate text-xs" : "max-w-[200px] truncate"}>Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((tokenRow) => (
                      <TableRow
                        key={tokenRow.id ?? `${tokenRow.chainId}-${tokenRow.tokenAddress}`}
                        className="border-b border-slate-100"
                      >
                        <TableCell className={compact ? "font-mono text-xs py-1.5" : "font-mono text-xs"}>{tokenRow.chainId}</TableCell>
                        <TableCell className={compact ? "text-xs font-medium py-1.5" : "font-medium"}>{tokenRow.symbol}</TableCell>
                        <TableCell className={compact ? "max-w-[120px] truncate font-mono text-xs text-muted-foreground py-1.5" : "max-w-[200px] truncate font-mono text-xs text-muted-foreground"} title={tokenRow.tokenAddress}>
                          {tokenRow.tokenAddress}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
