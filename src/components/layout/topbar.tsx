"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { signOut } from "next-auth/react";
import { Search, Bell, ChevronDown, User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RootState } from "@/store";
import { postLogout } from "@/lib/auth-api";

export function Topbar({ className }: { className?: string }) {
  const admin = useSelector((s: RootState) => s.auth.admin);

  const handleLogout = async () => {
    try {
      await postLogout();
    } catch {
      // continue to clear client session
    }
    signOut({ callbackUrl: "/login" });
  };

  const displayName = admin?.name?.trim() || admin?.email || "Account";

  return (
    <>
      {/* Sandbox banner */}
      <div className="flex shrink-0 items-center justify-between gap-4 bg-slate-900 px-6 py-3 text-sm text-white">
        <p className="text-slate-300">
          You're testing in a sandbox—your place to experiment with Klyra
          functionality.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 bg-white/10 text-white hover:bg-white/20"
        >
          Switch to live account
        </Button>
      </div>

      <header
        className={cn(
          "flex h-14 shrink-0 items-center justify-between gap-4 bg-slate-800 px-6 text-white",
          className
        )}
      >
        <div className="flex flex-1 items-center gap-4">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search"
              className="h-9 w-full bg-white/10 pl-9 text-sm text-white placeholder:text-slate-400 focus-visible:ring-white/20"
              aria-label="Search"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-sm text-white/90 hover:bg-white/10 hover:text-white"
                aria-label="Account menu"
              >
                {displayName}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  {admin?.name && (
                    <span className="font-medium text-foreground">{admin.name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {admin?.email ?? "—"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/account" className="flex items-center gap-2 cursor-pointer">
                  <User className="size-4" />
                  Account & security
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/general" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
