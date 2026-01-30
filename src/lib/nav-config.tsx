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
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroupConfig = {
  title: string;
  items: NavItem[];
};

export const coreNav: NavGroupConfig = {
  title: "Core",
  items: [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/balances", label: "Balances", icon: Wallet },
    { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    { href: "/users", label: "Customers", icon: Users },
    { href: "/inventory", label: "Inventory", icon: Package },
  ],
};

export const offchainNav: NavGroupConfig = {
  title: "Offchain",
  items: [
    { href: "/providers", label: "Providers", icon: Building2 },
    { href: "/payment-links", label: "Payment Links", icon: Link2 },
    { href: "/invoices", label: "Invoices", icon: FileText },
  ],
};

export const connectNav: NavGroupConfig = {
  title: "Connect",
  items: [
    { href: "/", label: "Overview", icon: Building2 },
    { href: "/users", label: "Accounts", icon: Users },
    { href: "/transactions", label: "Payouts", icon: Landmark },
  ],
};

export const developersNav: NavGroupConfig = {
  title: "Developers",
  items: [
    { href: "/settings", label: "API Keys", icon: Key },
    { href: "/settings", label: "Webhooks", icon: Webhook },
    { href: "/logs", label: "Logs", icon: ScrollText },
  ],
};

export const navGroups: NavGroupConfig[] = [
  coreNav,
  offchainNav,
  connectNav,
  developersNav,
];
