import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Users,
  Package,
  Link2,
  FileText,
  Building2,
  Landmark,
  Key,
  Webhook,
  ScrollText,
  LineChart,
  BarChart3,
  Store,
  AlertTriangle,
  UserPlus,
  Fuel,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import type { SessionPortalType } from "@/store/merchant-session-slice";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroupConfig = {
  title: string;
  items: NavItem[];
};

export const platformNavGroups: NavGroupConfig[] = [
  {
    title: "Core",
    items: [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/balances", label: "Balances", icon: Wallet },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/users", label: "Customers", icon: Users },
      { href: "/inventory", label: "Inventory", icon: Package },
      { href: "/validation", label: "Failed validation", icon: AlertTriangle },
    ],
  },
  {
    title: "Offchain",
    items: [
      { href: "/providers", label: "Providers", icon: Building2 },
      { href: "/payment-links", label: "Payment Links", icon: Link2 },
      { href: "/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    title: "Connect",
    items: [
      { href: "/connect", label: "Overview", icon: BarChart3 },
      { href: "/connect/quotes", label: "Quotes", icon: LineChart },
      { href: "/connect/merchants", label: "Businesses", icon: Store },
      { href: "/connect/settlements", label: "Settlements", icon: Landmark },
      { href: "/connect/kyc", label: "KYC", icon: ShieldCheck },
      { href: "/settings/gas", label: "Gas & sponsorship", icon: Fuel },
    ],
  },
  {
    title: "Developers",
    items: [
      { href: "/developers/api", label: "API Keys", icon: Key },
      { href: "/settings/api", label: "Webhooks", icon: Webhook },
      { href: "/logs", label: "Logs", icon: ScrollText },
    ],
  },
];

/**
 * Tenant portal — surfaces backed by `/api/v1/merchant/*` (Bearer + X-Business-Id).
 * IA: Sales → who paid; Catalog & checkout → what/how you sell; Finances → balances & payouts.
 */
export const merchantNavGroups: NavGroupConfig[] = [
  {
    title: "Sales",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    title: "Catalog & checkout",
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/payment-links", label: "Payment links", icon: Link2 },
      { href: "/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    title: "Finances",
    items: [
      { href: "/balances", label: "Balances", icon: Wallet },
      { href: "/settlements", label: "Payouts", icon: Landmark },
    ],
  },
  {
    title: "Developers",
    items: [{ href: "/developers/api", label: "API keys", icon: Key }],
  },
  {
    title: "Settings",
    items: [
      {
        href: "/settings/general",
        label: "Business & webhooks",
        icon: Building2,
      },
      { href: "/settings/gas", label: "Gas sponsorship", icon: Fuel },
      {
        href: "/settings/kyc",
        label: "Identity (KYC)",
        icon: BadgeCheck,
      },
      {
        href: "/settings/verification",
        label: "Verification & KYB",
        icon: ShieldCheck,
      },
      { href: "/settings/team", label: "Team", icon: UserPlus },
    ],
  },
];

/** Raw IA for a portal mode — gate visibility with {@link useShellNav} / real auth, not sessionType alone. */
export function getNavGroupsForSession(sessionType: SessionPortalType): NavGroupConfig[] {
  return sessionType === "merchant" ? merchantNavGroups : platformNavGroups;
}

/** @deprecated Use getNavGroupsForSession */
export const navGroups = platformNavGroups;
