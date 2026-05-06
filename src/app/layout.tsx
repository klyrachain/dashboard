import type { Metadata, Viewport } from "next";
import { PLATFORM_PRIMARY_HEX } from "@/lib/platform-theme";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { Inter_Tight } from "next/font/google";
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

/** Primary UI font family (Cerebri Sans). */
const cerebriSans = localFont({
  src: [
    { path: "../../public/font/CerebriSans-Light.woff", weight: "300", style: "normal" },
    { path: "../../public/font/CerebriSans-Regular.woff", weight: "400", style: "normal" },
    { path: "../../public/font/CerebriSans-Medium.woff", weight: "500", style: "normal" },
    { path: "../../public/font/CerebriSans-SemiBold.woff", weight: "600", style: "normal" },
    { path: "../../public/font/CerebriSans-Bold.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-cerebri-sans",
  display: "swap",
});

/** Tight tracking for marketing / business auth headings (see `.font-inter-tight-stack`). */
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
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
        className={`${cerebriSans.variable} ${interTight.variable} font-primary antialiased`}
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
