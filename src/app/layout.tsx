import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ReduxProvider } from "@/components/providers/redux-provider";

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
      <body className={`${alpino.variable} font-sans antialiased`}>
        <ReduxProvider>
          <DashboardShell>{children}</DashboardShell>
        </ReduxProvider>
      </body>
    </html>
  );
}
