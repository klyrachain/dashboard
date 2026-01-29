import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ReduxProvider } from "@/components/providers/redux-provider";
import { WebhookRefreshProvider } from "@/components/providers/webhook-refresh-provider";

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
  title: "Backoffice | Crypto Payment Control Center",
  description: "Control center for Crypto Payment System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${alpino.variable} ${ranade.variable} font-primary antialiased`}
      >
        <ReduxProvider>
          <WebhookRefreshProvider>
            <DashboardShell>{children}</DashboardShell>
          </WebhookRefreshProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
