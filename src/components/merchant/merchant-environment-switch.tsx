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
import {
  setMerchantEnvironment,
  type MerchantEnvironment,
} from "@/store/merchant-session-slice";
import { setStoredMerchantEnvironment } from "@/lib/businessAuthStorage";
import type { RootState } from "@/store";
import { cn } from "@/lib/utils";

type MerchantEnvironmentSwitchProps = {
  className?: string;
  labelClassName?: string;
};

export function MerchantEnvironmentSwitch({
  className,
  labelClassName,
}: MerchantEnvironmentSwitchProps) {
  const dispatch = useDispatch();
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const env = useSelector((s: RootState) => s.merchantSession.merchantEnvironment);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingIsLive, setPendingIsLive] = useState(false);

  if (sessionType !== "merchant") {
    return null;
  }

  const isLive = env === "LIVE";

  const requestChange = (nextIsLive: boolean) => {
    if (nextIsLive === isLive) return;
    setPendingIsLive(nextIsLive);
    setDialogOpen(true);
  };

  const applyChange = () => {
    const next: MerchantEnvironment = pendingIsLive ? "LIVE" : "TEST";
    dispatch(setMerchantEnvironment(next));
    setStoredMerchantEnvironment(next);
    setDialogOpen(false);
  };

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <span className={cn("hidden text-xs text-white/60 sm:inline", labelClassName)}>
          API mode
        </span>
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            labelClassName,
            !isLive ? "text-white" : "text-white/60"
          )}
        >
          Test
        </span>
        <Switch
          checked={isLive}
          onCheckedChange={requestChange}
          aria-label="Toggle merchant test or live environment"
          className={
            isLive
              ? "!bg-emerald-600 hover:!bg-emerald-600"
              : "!bg-amber-600 hover:!bg-amber-600"
          }
        />
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            labelClassName,
            isLive ? "text-emerald-200" : "text-white/60"
          )}
        >
          Live
        </span>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-none" showClose>
          <DialogHeader>
            <DialogTitle>
              {pendingIsLive ? "Switch to live mode?" : "Switch to test mode?"}
            </DialogTitle>
            <DialogDescription>
              {pendingIsLive
                ? "Live mode uses production APIs and can move real money. Confirm before continuing."
                : "Test mode uses sandbox APIs. Use it to try checkouts and webhooks without affecting live balances."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyChange}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
