import { getAccessContext } from "@/lib/data-access";
import {
  getPlatformGasBusinessesPage,
  getPlatformGasLedgerPage,
  getPlatformGasSettings,
} from "@/lib/data-gas";
import { MerchantGasSettingsContent } from "@/components/settings/merchant-gas-settings-content";
import { PlatformGasSettingsForm } from "@/components/settings/platform-gas-settings-form";
import { PlatformGasLedgerSection } from "@/components/settings/platform-gas-ledger-section";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

const LEDGER_REASONS = new Set(["SPONSORSHIP", "TOPUP", "ADJUSTMENT", "REFUND"]);

type SettingsGasPageProps = {
  searchParams: Promise<{ ledgerPage?: string; ledgerReason?: string }>;
};

export default async function SettingsGasPage({ searchParams }: SettingsGasPageProps) {
  const access = await getAccessContext();

  if (access.ok && access.context?.type === "merchant") {
    return <MerchantGasSettingsContent />;
  }

  const sp = await searchParams;
  const ledgerPage = Math.max(1, parseInt(sp.ledgerPage ?? "1", 10) || 1);
  const rawLedgerReason = sp.ledgerReason?.trim();
  const ledgerReason =
    rawLedgerReason && LEDGER_REASONS.has(rawLedgerReason) ? rawLedgerReason : undefined;

  const settings = await getPlatformGasSettings();
  const businesses = await getPlatformGasBusinessesPage(1, 50);
  const ledger = await getPlatformGasLedgerPage(ledgerPage, 25, ledgerReason);

  const err = !settings.ok
    ? settings.error
    : !businesses.ok
      ? businesses.error
      : !ledger.ok
        ? ledger.error
        : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Gas sponsorship</h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1 max-w-prose">
          Platform-wide sponsorship policy, business prepaid balances, and reconciliation.
        </p>
      </div>
      {err && (
        <div
          className="rounded-lg px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {mapInvoiceLoadError(err)}
        </div>
      )}
      {settings.ok && businesses.ok && (
        <PlatformGasSettingsForm
          initialSettings={settings.data}
          initialBusinesses={businesses.rows}
        />
      )}
      {ledger.ok && (
        <PlatformGasLedgerSection
          rows={ledger.rows}
          meta={ledger.meta}
          reasonFilter={ledgerReason}
        />
      )}
    </div>
  );
}
