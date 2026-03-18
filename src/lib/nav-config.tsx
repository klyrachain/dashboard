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
  UserCircle,
  UserPlus,
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
      { href: "/connect/merchants", label: "Merchants", icon: Store },
      { href: "/connect/settlements", label: "Settlements", icon: Landmark },
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

/** Tenant portal — no platform plumbing or other merchants’ data. */
export const merchantNavGroups: NavGroupConfig[] = [
  {
    title: "Payments",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/validation", label: "Payment Issues", icon: AlertTriangle },
      { href: "/users", label: "Customers", icon: Users },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/balances", label: "Wallets", icon: Wallet },
      { href: "/settlements", label: "Payouts", icon: Landmark },
    ],
  },
  {
    title: "Sales tools",
    items: [
      { href: "/payment-links", label: "Payment Links", icon: Link2 },
      { href: "/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    title: "Developers",
    items: [
      { href: "/developers/api", label: "API Keys", icon: Key },
      { href: "/settings/api", label: "Webhooks", icon: Webhook },
      { href: "/logs", label: "API Logs", icon: ScrollText },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings/general", label: "Business Profile", icon: UserCircle },
      { href: "/settings/team", label: "Team", icon: UserPlus },
    ],
  },
];

export function getNavGroupsForSession(sessionType: SessionPortalType): NavGroupConfig[] {
  return sessionType === "merchant" ? merchantNavGroups : platformNavGroups;
}

/** @deprecated Use getNavGroupsForSession */
export const navGroups = platformNavGroups;
