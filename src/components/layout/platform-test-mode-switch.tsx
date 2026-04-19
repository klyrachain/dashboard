"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setTestMode } from "@/store/layout-slice";
import type { RootState } from "@/store";
import { cn } from "@/lib/utils";

type PlatformTestModeSwitchProps = {
  variant: "header" | "sidebar";
  className?: string;
  switchClassName?: string;
};

export function PlatformTestModeSwitch({
  variant,
  className,
  switchClassName,
}: PlatformTestModeSwitchProps) {
  const dispatch = useDispatch();
  const testMode = useSelector((s: RootState) => s.layout.testMode);
  const isLive = !testMode;
  const [open, setOpen] = useState(false);
  const [pendingIsLive, setPendingIsLive] = useState(false);

  const requestChange = (nextIsLive: boolean) => {
    if (nextIsLive === isLive) return;
    setPendingIsLive(nextIsLive);
    setOpen(true);
  };

  const confirm = () => {
    dispatch(setTestMode(!pendingIsLive));
    setOpen(false);
  };

  const switchEl = (
    <Switch
      checked={isLive}
      onCheckedChange={requestChange}
      aria-label="Toggle live or testnet"
      className={cn(
        isLive ? "!bg-emerald-600 hover:!bg-emerald-600" : "!bg-amber-600 hover:!bg-amber-600",
        switchClassName
      )}
    />
  );

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md border-none" showClose>
        <DialogHeader>
          <DialogTitle>
            {pendingIsLive ? "Switch to live mode?" : "Switch to testnet?"}
          </DialogTitle>
          <DialogDescription>
            {pendingIsLive
              ? "Live mode uses production data and real transactions. Confirm you intend to operate in live."
              : "Testnet uses sandbox data. Use it to try flows without affecting live customers."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const modeLabels = (
    <>
      <span
        className={cn(
          "text-xs tabular-nums",
          variant === "header" ? "text-white/70" : "text-white/60",
          !isLive && "font-semibold text-white"
        )}
      >
        Test
      </span>
      {switchEl}
      <span
        className={cn(
          "text-xs tabular-nums",
          variant === "header" ? "text-white/70" : "text-white/60",
          isLive && "font-semibold text-emerald-200"
        )}
      >
        Live
      </span>
    </>
  );

  if (variant === "sidebar") {
    return (
      <>
        <div
          className={cn(
            "flex flex-col gap-2 rounded-md px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
            className
          )}
        >
          <span className="text-sm font-normal text-white/60">Platform mode</span>
          <div className="flex items-center justify-end gap-2">{modeLabels}</div>
        </div>
        {dialog}
      </>
    );
  }

  return (
    <>
      <div className={cn("flex items-center gap-2 pl-2", className)}>{modeLabels}</div>
      {dialog}
    </>
  );
}
