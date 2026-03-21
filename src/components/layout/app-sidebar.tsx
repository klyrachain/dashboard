"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Settings, ChevronDown, ChevronRight, LayoutPanelLeft, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import { setTheme, setTestMode, type LayoutTheme } from "@/store/layout-slice";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getNavGroupsForSession } from "@/lib/nav-config";
import { MerchantEnvironmentSwitch } from "@/components/merchant/merchant-environment-switch";
import { setStoredActiveBusinessId } from "@/lib/businessAuthStorage";
import { setActiveBusinessId, type MerchantBusiness } from "@/store/merchant-session-slice";

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80"
      >
        {title}
        <ChevronRight
          className={cn("size-3.5 transition-transform", open && "rotate-90")}
        />
      </button>
      {open && (
        <nav className="space-y-0.5">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-500/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const theme = useSelector((s: RootState) => s.layout.theme);
  const testMode = useSelector((s: RootState) => s.layout.testMode);
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const businesses = useSelector((s: RootState) => s.merchantSession.businesses);
  const activeBusinessId = useSelector((s: RootState) => s.merchantSession.activeBusinessId);

  const navGroups = getNavGroupsForSession(sessionType);
  const activeBusiness =
    businesses.find((b: MerchantBusiness) => b.id === activeBusinessId) ?? businesses[0];
  const workspaceLabel =
    sessionType === "merchant" && activeBusiness
      ? activeBusiness.name
      : "Klyra platform";

  return (
    <aside className="flex h-full w-64 flex-col bg-platform-primary text-white">
      {/* Workspace / business switcher */}
      <div className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md bg-indigo-500/80 text-white">
                  {(activeBusiness?.name ?? "K").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{workspaceLabel}</span>
              <ChevronDown className="size-4 shrink-0 text-white/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs font-medium text-slate-500">
              {sessionType === "merchant" ? "Business" : "Workspace"}
            </div>
            {sessionType === "merchant" && businesses.length > 0 ? (
              <>
                {businesses.map((b: MerchantBusiness) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => {
                      dispatch(setActiveBusinessId(b.id));
                      setStoredActiveBusinessId(b.id);
                    }}
                    className={b.id === activeBusinessId ? "bg-slate-100 font-medium" : ""}
                  >
                    {b.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}
            <div className="rounded-md bg-slate-50 px-2 py-1.5 text-sm text-slate-700">
              {sessionType === "merchant"
                ? activeBusiness?.name ?? "Business"
                : "Platform admin"}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-auto p-3">
        {navGroups.map((group) => (
          <NavGroup
            key={group.title}
            title={group.title}
            items={group.items}
            pathname={pathname}
          />
        ))}
      </nav>

      <div className="space-y-1 p-3">
        {sessionType === "platform" ? (
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/settings" || pathname.startsWith("/settings/")
                ? "bg-indigo-500/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Settings className="size-4 shrink-0" aria-hidden />
            Settings
          </Link>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-white/70 hover:bg-white/10 hover:text-white"
            >
              {theme === "sidebar" ? (
                <LayoutPanelLeft className="size-4 shrink-0" aria-hidden />
              ) : (
                <LayoutDashboard className="size-4 shrink-0" aria-hidden />
              )}
              <span className="text-sm">
                {theme === "sidebar" ? "Sidebar layout" : "Top nav layout"}
              </span>
              <ChevronDown className="size-4 shrink-0" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => dispatch(setTheme("sidebar" as LayoutTheme))}>
              <LayoutPanelLeft className="size-4" aria-hidden />
              Sidebar layout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dispatch(setTheme("no-sidebar" as LayoutTheme))}>
              <LayoutDashboard className="size-4" aria-hidden />
              Top nav layout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {sessionType === "merchant" ? (
          <div className="flex items-center justify-between rounded-md px-3 py-2">
            <MerchantEnvironmentSwitch />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md px-3 py-2">
            <span className="text-sm font-normal text-white/60">
              Test mode
            </span>
            <Switch
              checked={testMode}
              onCheckedChange={(v) => dispatch(setTestMode(v))}
              aria-label="Toggle test mode"
              className="data-[state=checked]:bg-indigo-500"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
