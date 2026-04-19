"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ImageIcon, Link2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PaymentLinkCurrencyPicker } from "@/components/merchant/payment-link-currency-picker";
import { cn } from "@/lib/utils";
import type {
  MerchantProductCreateBody,
  MerchantProductPatchBody,
  MerchantProductRow,
} from "@/types/merchant-api";

const PRODUCT_TYPES = ["DIGITAL", "PHYSICAL", "SERVICE"] as const;
type ProductType = (typeof PRODUCT_TYPES)[number];

const TYPE_LABEL: Record<ProductType, string> = {
  DIGITAL: "Digital",
  PHYSICAL: "Physical",
  SERVICE: "Service",
};

export type ProductFormSavePayload =
  | { kind: "create"; body: MerchantProductCreateBody }
  | { kind: "edit"; id: string; body: MerchantProductPatchBody };

export type ProductFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null means create a new product */
  product: MerchantProductRow | null;
  onSave: (payload: ProductFormSavePayload) => Promise<void>;
  /** When set, drag and drop or file pick uploads the file and returns a public image URL for Core */
  uploadProductImage?: (file: File) => Promise<string>;
  isSubmitting?: boolean;
};

const inputLike =
  "flex min-h-[4.5rem] w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  onSave,
  uploadProductImage,
  isSubmitting = false,
}: ProductFormModalProps) {
  const isEditing = Boolean(product);
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProductType>("DIGITAL");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageTab, setImageTab] = useState<"file" | "link">("file");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    setUploadError(null);
    if (product) {
      setName(product.name ?? "");
      setDescription(product.description ?? "");
      setType(
        PRODUCT_TYPES.includes(product.type as ProductType)
          ? (product.type as ProductType)
          : "DIGITAL"
      );
      setPrice(product.price != null ? String(product.price) : "");
      setCurrency((product.currency ?? "USD").trim().toUpperCase() || "USD");
      setImageUrl(product.imageUrl ?? "");
      setIsActive(product.isActive !== false);
    } else {
      setName("");
      setDescription("");
      setType("DIGITAL");
      setPrice("");
      setCurrency("USD");
      setImageUrl("");
      setIsActive(true);
    }
    setImageTab("file");
  }, [open, product]);

  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setUploadError(null);
      if (!file.type.startsWith("image/")) {
        setUploadError("Please choose an image file");
        return;
      }
      if (!uploadProductImage) {
        setUploadError(
          "File upload is not configured for this workspace yet. Paste an image address on the link tab instead."
        );
        return;
      }
      setUploadingFile(true);
      try {
        const url = await uploadProductImage(file);
        setImageUrl(url);
        setImageTab("link");
      } catch {
        setUploadError("Upload did not complete. Try again or paste an image address.");
      } finally {
        setUploadingFile(false);
      }
    },
    [uploadProductImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      void processFile(f);
    },
    [processFile]
  );

  const handleSubmit = async () => {
    setLocalError(null);
    const trimmed = name.trim();
    const p = parseFloat(price);
    if (!trimmed) {
      setLocalError("Enter a product name");
      return;
    }
    if (Number.isNaN(p) || p < 0) {
      setLocalError("Enter a valid price");
      return;
    }

    const cur = currency.trim().toUpperCase() || "USD";
    const desc = description.trim();
    const img = imageUrl.trim();

    const base: MerchantProductCreateBody = {
      name: trimmed,
      price: p,
      type,
      currency: cur,
      ...(desc ? { description: desc } : {}),
      ...(img ? { imageUrl: img } : {}),
      isActive,
    };

    try {
      if (isEditing && product) {
        const patch: MerchantProductPatchBody = {
          name: trimmed,
          price: p,
          type,
          currency: cur,
          description: desc || undefined,
          imageUrl: img || undefined,
          isActive,
        };
        await onSave({ kind: "edit", id: product.id, body: patch });
      } else {
        await onSave({ kind: "create", body: base });
      }
      onOpenChange(false);
    } catch {
      setLocalError("Save did not complete. Check fields and try again.");
    }
  };

  const busy = isSubmitting || uploadingFile;
  const titleId = `${formId}-title`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-[540px] */}
      <DialogContent
        className="border-none max-w-xl
        "
        aria-describedby={undefined}
        aria-labelledby={titleId}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>
            {isEditing ? "Edit product" : "New product"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-name`}>Name</Label>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-desc`}>Description</Label>
            <textarea
              id={`${formId}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What the customer receives"
              rows={3}
              disabled={busy}
              className={cn(inputLike, "resize-none")}
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Product type</span>
            <div
              className="grid grid-cols-3 gap-2 rounded-lg border border-border p-1"
              role="group"
              aria-label="Product type"
            >
              {PRODUCT_TYPES.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={type === t ? "default" : "ghost"}
                  className="h-9 text-xs sm:text-sm"
                  disabled={busy}
                  onClick={() => setType(t)}
                >
                  {TYPE_LABEL[t]}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1.1fr] sm:items-end">
            <div className="min-w-0">
              <PaymentLinkCurrencyPicker
                value={currency}
                onChange={setCurrency}
                chargeKind="FIAT"
                disabled={busy}
                triggerPlaceholder="Search currency"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor={`${formId}-price`}>Price</Label>
              <Input
                id={`${formId}-price`}
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                disabled={busy}
                className="w-full min-w-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Product image</span>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
              <Button
                type="button"
                variant={imageTab === "file" ? "default" : "ghost"}
                className="h-9 gap-2"
                disabled={busy}
                onClick={() => {
                  setImageTab("file");
                  setUploadError(null);
                }}
              >
                <Upload className="size-4 shrink-0" aria-hidden />
                File
              </Button>
              <Button
                type="button"
                variant={imageTab === "link" ? "default" : "ghost"}
                className="h-9 gap-2"
                disabled={busy}
                onClick={() => {
                  setImageTab("link");
                  setUploadError(null);
                }}
              >
                <Link2 className="size-4 shrink-0" aria-hidden />
                Link
              </Button>
            </div>

            {imageTab === "file" ? (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    void processFile(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm transition-colors",
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/40",
                    busy && "pointer-events-none opacity-60"
                  )}
                >
                  {uploadingFile ? (
                    <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
                  ) : (
                    <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
                  )}
                  <span className="font-medium text-foreground">
                    {uploadingFile ? "Uploading" : "Drop an image here or click to browse"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PNG or JPG recommended. Stored as a public URL on your catalog after upload.
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor={`${formId}-imgurl`}>Image address</Label>
                <Input
                  id={`${formId}-imgurl`}
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste HTTPS image URL"
                  disabled={busy}
                />
              </div>
            )}

            {uploadError ? (
              <p className="text-xs text-destructive" role="alert">
                {uploadError}
              </p>
            ) : null}

            {imageUrl.trim() && imageTab === "file" ? (
              <p className="text-xs text-muted-foreground">
                Preview uses your saved address after upload. Switch to Link to edit the URL.
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5 pr-3">
              <Label className="text-sm font-medium">Listed for sale</Label>
              <p className="text-xs text-muted-foreground">
                When off, the product is archived and hidden from new checkouts
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={busy}
            />
          </div>

          {localError ? (
            <p className="text-sm text-destructive" role="alert">
              {localError}
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void handleSubmit()}
            disabled={busy || !name.trim() || !price}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : null}
            {isEditing ? "Save" : "Create product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
