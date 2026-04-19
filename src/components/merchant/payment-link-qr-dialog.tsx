"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
} from "react";
import { Copy, Download } from "lucide-react";
import { motion, useAnimationControls } from "framer-motion";
import { domToBlob, waitUntilLoad } from "modern-screenshot";
import { QRCodeSVG } from "qrcode.react";
import {
  NetworkArbitrumOne,
  NetworkBase,
  NetworkBinanceSmartChain,
  NetworkEthereum,
  NetworkPolygon,
  NetworkTron,
} from "@web3icons/react";
import type { IconComponent } from "@web3icons/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/ActionTooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buildPaymentLinkPublicUrl } from "@/lib/merchant-commerce-helpers";
import { cn } from "@/lib/utils";
import type { MerchantPayPageRow } from "@/types/merchant-api";

const BASE_CHAINS: { id: string; label: string; Icon: IconComponent }[] = [
  { id: "ethereum", label: "Ethereum", Icon: NetworkEthereum },
  { id: "tron", label: "Tron", Icon: NetworkTron },
  { id: "polygon", label: "Polygon", Icon: NetworkPolygon },
  { id: "arbitrum", label: "Arbitrum", Icon: NetworkArbitrumOne },
  { id: "base", label: "Base", Icon: NetworkBase },
  { id: "bsc", label: "BNB Chain", Icon: NetworkBinanceSmartChain },
];

const CHAIN_COUNT = BASE_CHAINS.length;
const REPEAT_MULTIPLIER = 5;
const EXTENDED_CHAINS = Array.from({ length: REPEAT_MULTIPLIER }).flatMap(() => BASE_CHAINS);

const MIDDLE_ARRAY_START = Math.floor(REPEAT_MULTIPLIER / 2) * CHAIN_COUNT;

// Upgraded Sizes
const ITEM_PX = 64; 
const GAP_PX = 16;  
const STRIDE = ITEM_PX + GAP_PX;

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
  
  const [activeIndex, setActiveIndex] = useState(MIDDLE_ARRAY_START);
  
  // Refs ensure the auto-play timer never loses track of the current position
  const currentIndexRef = useRef(MIDDLE_ARRAY_START);
  const isAnimatingRef = useRef(false);
  const controls = useAnimationControls();

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

  // Mathematical absolute centering (No viewport measuring needed)
  const calculateX = useCallback((index: number) => {
    return -(index * STRIDE + ITEM_PX / 2);
  }, []);

  // Snap to center immediately when dialog opens
  useLayoutEffect(() => {
    if (!open) return;
    controls.set({ x: calculateX(MIDDLE_ARRAY_START) });
    currentIndexRef.current = MIDDLE_ARRAY_START;
    queueMicrotask(() => {
      setActiveIndex(MIDDLE_ARRAY_START);
    });
  }, [open, controls, calculateX]);

  // Core movement engine
  const glideTo = useCallback(async (targetIndex: number) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    setActiveIndex(targetIndex);
    currentIndexRef.current = targetIndex;

    // 1. Move to the next item
    await controls.start({
      x: calculateX(targetIndex),
      transition: { type: "spring", stiffness: 220, damping: 28 } 
    });

    // 2. Invisible Loop Reset
    let snapIndex = targetIndex;
    if (targetIndex >= MIDDLE_ARRAY_START + CHAIN_COUNT) {
      snapIndex = targetIndex - CHAIN_COUNT;
    } else if (targetIndex < MIDDLE_ARRAY_START) {
      snapIndex = targetIndex + CHAIN_COUNT;
    }

    if (snapIndex !== targetIndex) {
      controls.set({ x: calculateX(snapIndex) });
      setActiveIndex(snapIndex);
      currentIndexRef.current = snapIndex;
    }

    isAnimatingRef.current = false;
  }, [calculateX, controls]);

  // The Auto-Play Timer
  useEffect(() => {
    if (!open) return;
    
    const timer = setInterval(() => {
      void glideTo(currentIndexRef.current + 1);
    }, 2500);

    return () => clearInterval(timer);
  }, [open, glideTo]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="border-none bg-transparent p-0 shadow-none max-w-sm sm:max-w-md"
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

            <div
              // Increased wrapper height to fit the larger 68px box
              className="relative isolate h-[88px] w-full max-w-full overflow-hidden"
              role="group"
            >
              {/* TRACK CONTAINER anchored exactly to 50% left */}
              <motion.div
                className="absolute left-[50%] top-1/2 flex w-max -translate-y-1/2 items-center"
                style={{ gap: GAP_PX, willChange: "transform" }}
                animate={controls}
              >
                {EXTENDED_CHAINS.map((chain, index) => {
                  const isSelected = index === activeIndex;
                  
                  return (
                    <button
                      key={`${index}-${chain.id}`}
                      type="button"
                      // Icons explicitly set to 64px
                      style={{ width: ITEM_PX, height: ITEM_PX }}
                      className={cn(
                        "relative flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        isSelected ? "z-[1]" : "z-0"
                      )}
                      onClick={() => void glideTo(index)}
                      aria-pressed={isSelected}
                      aria-label={chain.label}
                    >
                      <motion.span
                        className="flex items-center justify-center"
                        animate={{
                          scale: isSelected ? 1 : 0.75,
                          opacity: isSelected ? 1 : 0.4,
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <chain.Icon variant="background" size={48} aria-hidden />
                      </motion.span>
                    </button>
                  );
                })}
              </motion.div>

              <div
                className="pointer-events-none absolute inset-0 z-2 bg-gradient-to-x from-white/20 via-transparent to-white/0 dark:from-black/20 dark:via-transparent dark:to-black/0"
                aria-hidden
              />

              {/* THE FIXED AREA
                 Size is 68px. Items are 64px. 
                 Exactly 2px border + 2px empty space = perfectly framed.
              */}
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 z-[3] box-border size-[64px] -translate-x-1/2 -translate-y-1/2 border border-primary bg-primary/[0.04] shadow-[0_0_12px_rgba(0,0,0,0.12)] ring-1 ring-primary/20 dark:bg-primary/10 dark:shadow-[0_0_12px_rgba(0,0,0,0.35)]"
                aria-hidden
              />
            </div>
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