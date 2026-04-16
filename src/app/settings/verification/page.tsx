import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCoreBaseUrl } from "@/lib/core-api";

type ProviderRailMetadata = {
  providerCode: string;
  providerName: string;
  supportedCountries: string[];
  supportedFiatCurrencies: string[];
  supportedCryptoAssets: string[];
  channels: string[];
  kycRequirements: string[];
  status: "ACTIVE" | "PLANNED";
};

async function getProviderRails(): Promise<ProviderRailMetadata[]> {
  try {
    const core = getCoreBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${core}/api/provider-metadata`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const payload: unknown = await res.json().catch(() => ({}));
    if (!res.ok || !payload || typeof payload !== "object") return [];
    const envelope = payload as { success?: boolean; data?: unknown };
    if (envelope.success !== true || !Array.isArray(envelope.data)) return [];
    return envelope.data.filter((row): row is ProviderRailMetadata => {
      if (!row || typeof row !== "object") return false;
      const typed = row as Record<string, unknown>;
      return (
        typeof typed.providerCode === "string" &&
        typeof typed.providerName === "string" &&
        Array.isArray(typed.supportedCountries) &&
        Array.isArray(typed.supportedFiatCurrencies) &&
        Array.isArray(typed.supportedCryptoAssets) &&
        Array.isArray(typed.channels) &&
        Array.isArray(typed.kycRequirements)
      );
    });
  } catch {
    return [];
  }
}

export default async function SettingsVerificationPage() {
  const rails = await getProviderRails();

  return (
    <div className="space-y-6 font-primary text-body">
      <header className="space-y-1">
        <h1 className="text-display font-semibold tracking-tight">Verification</h1>
        <p className="font-secondary text-caption text-muted-foreground max-w-prose">
          Start or continue KYB/KYC review for your business account.
        </p>
      </header>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>KYB and KYC review</CardTitle>
          <CardDescription>
            Submit your business profile and owner information to unlock higher
            limits and additional payout rails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use this center to manage business verification status and unlock
            higher limits with more payout rails.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button">
              <Link href="/settings/general">Start or continue verification</Link>
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/settings/team">Open team settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Supported fiat rail partners</CardTitle>
          <CardDescription>
            Active corridors from Yellow Card, Kotani Pay, and Cowrie for current rollout planning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rails.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Provider metadata is currently unavailable. Retry after Core is reachable.
            </p>
          ) : (
            rails.map((provider) => (
              <section key={provider.providerCode} className="rounded-md border p-3">
                <header className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{provider.providerName}</h3>
                  <span className="text-xs text-muted-foreground">{provider.status}</span>
                </header>
                <p className="mt-2 text-xs text-muted-foreground">
                  Countries: {provider.supportedCountries.join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fiat: {provider.supportedFiatCurrencies.join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Crypto: {provider.supportedCryptoAssets.join(", ")}
                </p>
              </section>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
