"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";
import { HeaderNoSidebar } from "./header-no-sidebar";
import { StatusIndicator } from "@/components/status-indicator";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const theme = useSelector((state: RootState) => state.layout.theme);

  if (theme === "no-sidebar") {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <HeaderNoSidebar />
        <main className="flex-1 overflow-auto bg-slate-50 p-6">{children}</main>
        <StatusIndicator />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto bg-slate-50 p-6">{children}</main>
      </div>
      <StatusIndicator />
    </div>
  );
}
