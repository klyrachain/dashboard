"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Today
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">Date range</span>
          <Select defaultValue="7d">
            <SelectTrigger className="h-8 w-[130px] bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="daily">
            <SelectTrigger className="h-8 w-[100px] bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 bg-white text-sm">
            Compare previous period
          </Button>
        </div>
      </div>
    </div>
  );
}
