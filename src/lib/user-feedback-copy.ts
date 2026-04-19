/**
 * User-facing copy per md/user.feedback.md: no blame, sweet tone, no technical jargon.
 * Map technical/backend errors to these strings. Move to locales/en.json when i18n is added.
 */

/** Map quote/API error messages to sweet user copy. */
export function mapQuoteError(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return quoteFailed;
  const lower = raw.toLowerCase();
  if (lower.includes("timeout") || lower.includes("network")) return apiTimeout;
  if (lower.includes("500") || lower.includes("server")) return serverError;
  if (lower.includes("404") || lower.includes("not found")) return notFound;
  if (lower.includes("slippage") || lower.includes("revert")) return slippage;
  if (lower.includes("insufficient") || lower.includes("gas")) return insufficientGas;
  if (lower.includes("reject") || lower.includes("denied")) return walletRejected;
  return quoteFailed;
}

/** Generic quote failure (no technical detail). */
export const quoteFailed =
  "The network is being a bit stubborn right now. Your funds are safe—try refreshing the quote.";

export const serverError =
  "Don't fret, our servers just tripped over a cable. We're fixing it now. Please try again in a moment.";

export const notFound =
  "We looked everywhere, but this one seems to have wandered off. Let's get you back.";

export const apiTimeout =
  "Things are taking a little longer than usual. We're still trying to reach the network.";

export const slippage =
  "The price moved while you were clicking! Let's update the quote and try that swap again.";

export const insufficientGas =
  "It looks like you need a little more ETH to cover the gas fee for this trip.";

export const walletRejected =
  "Transaction cancelled. No worries, we'll be here when you're ready.";

/** Empty state: no token pairs (quotes page). */
export const quotesEmpty =
  "It's quiet here. When you have swap activity, your most traded pairs will show up—drag cards to reorder once they do.";

/** Onramp: amount required (no "invalid"). */
export const onrampAmountRequired = "Please enter an amount to get a quote.";

/** Volume/chart load failure (no technical detail). */
export const volumeLoadError =
  "Things are taking a little longer than usual. We're still trying to reach the network.";

/** Invoice list load failure — map raw API error to sweet copy. */
/** Portal / key cannot access invoices (Core 403). */
export const invoiceAccessDenied =
  "We cannot show invoices for this account with your current access. Ask a team admin if you need invoice access.";

export const invoiceSignInRequired =
  "Please sign in to your business account and select a business to see invoices.";

export function mapInvoiceLoadError(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) {
    return "We couldn't load that just now. Try refreshing the page.";
  }
  const lower = raw.toLowerCase();
  if (lower.includes("timeout") || lower.includes("network")) return apiTimeout;
  if (lower.includes("500") || lower.includes("server")) return serverError;
  if (lower.includes("404") || lower.includes("not found")) return notFound;
  if (lower.includes("sign in")) return invoiceSignInRequired;
  if (
    lower.includes("403") ||
    lower.includes("forbidden") ||
    lower.includes("does not allow") ||
    lower.includes("permission")
  ) {
    return invoiceAccessDenied;
  }
  return serverError;
}

export const teamAccessDenied =
  "You do not have access to team settings for this business right now. Ask a business owner or admin.";

export const teamSignInRequired =
  "Please sign in to your business account to manage team members.";

export function mapTeamLoadError(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return serverError;
  const lower = raw.toLowerCase();
  if (
    lower.includes("core api base url is not configured") ||
    lower.includes("core_not_configured")
  ) {
    return "Team settings are temporarily unavailable due to a configuration issue. Please try again shortly.";
  }
  if (lower.includes("timeout") || lower.includes("network")) return apiTimeout;
  if (lower.includes("500") || lower.includes("server")) return serverError;
  if (lower.includes("404") || lower.includes("not found")) return notFound;
  if (
    lower.includes("unauthorized") ||
    lower.includes("auth") ||
    lower.includes("token") ||
    lower.includes("sign in")
  ) {
    return teamSignInRequired;
  }
  if (lower.includes("403") || lower.includes("forbidden") || lower.includes("permission")) {
    return teamAccessDenied;
  }
  return serverError;
}

/** Empty state: no invoices yet. */
export const invoicesEmpty =
  "No invoices yet. Create one to get started.";