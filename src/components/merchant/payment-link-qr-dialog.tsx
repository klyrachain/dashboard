"use client";

import { useCallback, useRef } from "react";
import { Copy, Download } from "lucide-react";
import { domToBlob, waitUntilLoad } from "modern-screenshot";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/ActionTooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buildPaymentLinkPublicUrl } from "@/lib/merchant-commerce-helpers";
import type { MerchantPayPageRow } from "@/types/merchant-api";
import { SupportedNetworksCarousel } from "@/components/merchant/supported-networks-carousel";

export type PaymentLinkQrDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: MerchantPayPageRow | null;
  checkoutBaseUrl: string;
  companyName: string;
  companyLogoUrl: string | null;
  headline: string;
};

function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function isSameOriginResourceUrl(url: string): boolean {
  if (!url || url.startsWith("data:")) return true;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Exclude toolbar actions from the asset; drop cross-origin raster images that taint canvas export. */
function screenshotFilter(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  if (node.closest("[data-screenshot-ignore]")) return false;
  if (node instanceof HTMLImageElement) {
    const src = node.currentSrc || node.src;
    return isSameOriginResourceUrl(src);
  }
  if (typeof SVGImageElement !== "undefined" && node instanceof SVGImageElement) {
    const href =
      node.getAttribute("href") ||
      node.getAttribute("xlink:href") ||
      (node as SVGImageElement).href?.baseVal ||
      "";
    return isSameOriginResourceUrl(href);
  }
  return true;
}

export function PaymentLinkQrDialog({
  open,
  onOpenChange,
  row,
  checkoutBaseUrl,
  companyName,
  companyLogoUrl,
  headline,
}: PaymentLinkQrDialogProps) {
  const checkoutUrl = row
    ? buildPaymentLinkPublicUrl(
        row.publicCode?.trim() || row.slug,
        checkoutBaseUrl
      )
    : "";

  const captureCardRef = useRef<HTMLDivElement>(null);

  const copyCheckoutUrl = useCallback(async () => {
    if (!checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(checkoutUrl);
    } catch {
      /* ignore */
    }
  }, [checkoutUrl]);

  const downloadModalPng = useCallback(async () => {
    const node = captureCardRef.current;
    if (!node || !checkoutUrl) return;

    const baseName =
      headline
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64) ||
      (row?.slug?.trim().replace(/[^\w-]+/g, "-").slice(0, 64) ?? "payment-link");

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
    await new Promise<void>((r) => setTimeout(r, 200));
    await waitUntilLoad(node, { timeout: 8000 }).catch(() => {});

    const rect = node.getBoundingClientRect();
    const w = Math.max(1, Math.ceil(rect.width));
    const h = Math.max(1, Math.ceil(rect.height));

    const triggerBlobDownload = (blob: Blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${baseName}-checkout.png`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      queueMicrotask(() => URL.revokeObjectURL(objectUrl));
    };

    const captureOptions = {
      width: w,
      height: h,
      scale: 2,
      backgroundColor: "#ffffff" as const,
      font: false as const,
      filter: screenshotFilter,
      fetch: {
        bypassingCache: true as const,
        requestInit: { mode: "cors" as const, credentials: "omit" as const },
      },
      style: {
        backdropFilter: "none",
        backgroundColor: "rgb(255 255 255 / 0.96)",
        ...({ WebkitBackdropFilter: "none" } as Record<string, string>),
      } as Partial<CSSStyleDeclaration>,
    };

    try {
      const blob = await domToBlob(node, captureOptions);
      if (blob.size > 256) {
        triggerBlobDownload(blob);
        return;
      }
    } catch {
      /* retry smaller */
    }

    try {
      const blob = await domToBlob(node, { ...captureOptions, scale: 1 });
      if (blob.size > 256) {
        triggerBlobDownload(blob);
      }
    } catch {
      /* raster failed */
    }
  }, [checkoutUrl, headline, row?.slug]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="border-none bg-transparent p-0 shadow-none max-w-md sm:max-w-md"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          Scan to pay {headline || "payment link"}
        </DialogTitle>

        <div
          className="absolute -inset-4 rounded-full bg-primary/20 blur-3xl z-0"
          aria-hidden
        />

        <div
          ref={captureCardRef}
          className="relative z-10 flex flex-col items-center overflow-hidden rounded-[2rem] border border-white/20 bg-white/60 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl"
        >
          <div className="flex w-full items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {headline}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {companyName}
              </p>
              <Avatar 
              // className="size-8 rounded-2xl border border-border shadow-sm"
              >
                {companyLogoUrl ? (
                  <AvatarImage
                    src={companyLogoUrl}
                    alt={`${companyName} logo`}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-2xl text-base font-semibold">
                  {companyInitials(companyName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="relative mt-5 rounded-2xl bg-white p-4 shadow-inner ring-1 ring-black/5">
            <div className="absolute left-2 top-2 size-4 border-l-2 border-t-2 border-primary" aria-hidden />
            <div className="absolute right-2 top-2 size-4 border-r-2 border-t-2 border-primary" aria-hidden />
            <div className="absolute bottom-2 left-2 size-4 border-b-2 border-l-2 border-primary" aria-hidden />
            <div className="absolute bottom-2 right-2 size-4 border-b-2 border-r-2 border-primary" aria-hidden />

            {checkoutUrl ? (
              <QRCodeSVG
                value={checkoutUrl}
                size={300}
                level="Q"
                includeMargin={false}
                className="rounded-lg"
              />
            ) : null}
          </div>

          <div className="mb-2 mt-4 flex w-full min-w-0 flex-col items-center gap-4">
            <p className="text-center text-xs font-medium text-muted-foreground">
              Pay with tokens from supported networks
            </p>

            <SupportedNetworksCarousel
              enabled={open}
              itemPx={64}
              gapPx={16}
              iconSize={48}
              showCenterFrame
              showEdgeGradient
            />
          </div>

          <div className="flex w-full flex-col items-center gap-3 text-center">
            <div className="flex w-full items-center gap-2 rounded-xl bg-black/5 p-3">
              <p className="min-w-0 flex-1 truncate text-left font-mono text-sm font-bold text-foreground">
                {checkoutUrl}
              </p>
              <div className="flex shrink-0 items-center gap-1.5" data-screenshot-ignore>
                <ActionTooltip
                  label="Download checkout card as image"
                  actionLabel="Saved"
                  onClick={() => {
                    void downloadModalPng();
                  }}
                  side="top"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0 active:scale-[0.98]"
                    disabled={!checkoutUrl}
                    aria-label="Download checkout card as PNG"
                  >
                    <Download className="size-3.5" aria-hidden />
                  </Button>
                </ActionTooltip>
                <ActionTooltip
                  label="Copy checkout URL"
                  actionLabel="Copied"
                  onClick={() => {
                    void copyCheckoutUrl();
                  }}
                  side="top"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
                    disabled={!checkoutUrl}
                    aria-label="Copy checkout URL"
                  >
                    <Copy className="size-3.5" aria-hidden />
                  </Button>
                </ActionTooltip>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Powered by morapay</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}