export type PaymentLinkCountryFiatOption = {
  code: string;
  name: string;
  currency: string;
};

export const PAYMENT_LINK_COUNTRY_FIAT_OPTIONS: PaymentLinkCountryFiatOption[] = [
  { code: "GH", name: "Ghana", currency: "GHS" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "CI", name: "Cote d'Ivoire", currency: "XOF" },
  { code: "US", name: "United States", currency: "USD" },
];

const FIAT_BY_COUNTRY = new Map(
  PAYMENT_LINK_COUNTRY_FIAT_OPTIONS.map((option) => [option.code, option.currency])
);

export function normalizeCountryCode(country: string | null | undefined): string {
  return country?.trim().toUpperCase().slice(0, 2) ?? "";
}

export function resolveFiatCurrencyForCountry(
  country: string | null | undefined
): string {
  const code = normalizeCountryCode(country);
  return FIAT_BY_COUNTRY.get(code) ?? "USD";
}
