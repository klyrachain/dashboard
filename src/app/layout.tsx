import type { Metadata, Viewport } from "next";
import { PLATFORM_PRIMARY_HEX } from "@/lib/platform-theme";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";
import { ReduxProvider } from "@/components/providers/redux-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { LayoutPreferenceSync } from "@/components/providers/layout-preference-sync";
import { BaseCurrencySync } from "@/components/providers/base-currency-sync";
import { WebhookRefreshProvider } from "@/components/providers/webhook-refresh-provider";
import { LayoutSwitcher } from "@/components/auth/layout-switcher";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { parseLayoutPreference } from "@/lib/layout-preference-cookie";
import { getAccessContext } from "@/lib/data-access";
import { merchantSessionFromAccess } from "@/lib/merchant-session-initial";
import { PortalRoleCookieSync } from "@/components/providers/portal-role-cookie-sync";
import { PlatformChromeMeta } from "@/components/layout/platform-chrome-meta";

/** Primary: headings and main UI (Alpino). */
const alpino = localFont({
  src: [
    {
      path: "../../public/font/Alpino_Complete/Fonts/WEB/fonts/Alpino-Variable.woff2",
      style: "normal",
    },
  ],
  variable: "--font-alpino",
  display: "swap",
  weight: "100 900",
});

/** Secondary: body and reading (Ranade). */
const ranade = localFont({
  src: [
    {
      path: "../../public/font/Ranade_Complete/Fonts/WEB/fonts/Ranade-Variable.woff2",
      style: "normal",
    },
  ],
  variable: "--font-ranade",
  display: "swap",
  weight: "100 700",
});

export const metadata: Metadata = {
  title: "Morapay Backoffice | Payment Control Center",
  description: "Morapay control center for payments and operations",
};

/** Safari / mobile browser toolbar and tab tint (`<meta name="theme-color">`). */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PLATFORM_PRIMARY_HEX },
    { media: "(prefers-color-scheme: dark)", color: PLATFORM_PRIMARY_HEX },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const layoutPref = parseLayoutPreference(cookieStore.get("klyra_ui")?.value);
  const access = await getAccessContext();
  const merchantSession = merchantSessionFromAccess(access);

  return (
    <html lang="en">
      <body
        className={`${alpino.variable} ${ranade.variable} font-primary antialiased`}
        style={{ backgroundColor: PLATFORM_PRIMARY_HEX }}
      >
        <PlatformChromeMeta />
        <ReduxProvider
          initialLayoutPreference={layoutPref ?? undefined}
          initialMerchantSession={merchantSession}
        >
          <PortalRoleCookieSync />
          <SessionProvider>
            <AuthSessionSync>
              <LayoutPreferenceSync />
              <BaseCurrencySync />
              <WebhookRefreshProvider>
                <LayoutSwitcher>{children}</LayoutSwitcher>
              </WebhookRefreshProvider>
            </AuthSessionSync>
          </SessionProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
