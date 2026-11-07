"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Eye, EyeOff, PackageX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProductForm } from "@/components/sell/ProductForm";
import { SellerGate } from "@/components/sell/SellerGate";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import type { ProductDetail } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Live", tone: "badge-success" },
  draft: { label: "Draft", tone: "" },
  sold_out: { label: "Sold out", tone: "badge-warning" },
  removed: { label: "Removed", tone: "badge-danger" },
};

function EditListing() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useApi<{ product: ProductDetail }>(`/products/${id}`);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!user) return null;
  if (loading && !data) return <div className="mx-auto max-w-3xl"><div className="skeleton h-96 rounded-lg" /></div>;

  const product = data?.product;
  if (error || !product || product.seller_id !== user.id) {
    return (
      <EmptyState
        icon={<PackageX size={32} aria-hidden />}
        title="We couldn't find that listing"
        text="It may have been removed, or it isn't yours."
        action={error && !(error instanceof ApiError && error.status === 404) ? <Button onClick={reload}>Try again</Button> : <ButtonLink href="/sell">Back to my listings</ButtonLink>}
      />
    );
  }

  const st = STATUS[product.status] ?? { label: product.status, tone: "" };

  const setStatus = async (next: "active" | "draft") => {
    setBusy(true);
    try {
      await api.patch(`/products/${product.id}`, { status: next });
      toast.success(next === "active" ? "Your listing is live" : "Moved to drafts");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the listing");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/products/${product.id}`);
      toast.success("Listing removed");
      router.push("/sell");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't remove the listing");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/sell" className="text-ink-soft">My listings</Link>
        <ChevronRight size={14} aria-hidden />
        <span aria-current="page" className="line-clamp-1">{product.title}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2">Edit listing</h1>
          <span className={`badge ${st.tone}`}>{st.label}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.status === "active" && <ButtonLink href={`/products/${product.id}`} variant="clay" size="sm">View in store</ButtonLink>}
          {product.status === "draft" && <Button size="sm" loading={busy} onClick={() => setStatus("active")} icon={<Eye size={15} aria-hidden />}>Publish</Button>}
          {(product.status === "active" || product.status === "sold_out") && <Button size="sm" variant="clay" loading={busy} onClick={() => setStatus("draft")} icon={<EyeOff size={15} aria-hidden />}>Unpublish</Button>}
          {product.status !== "removed" && <Button size="sm" variant="ghost" className="text-danger!" onClick={() => setConfirmRemove(true)} icon={<Trash2 size={15} aria-hidden />}>Remove</Button>}
        </div>
      </div>

      {product.status === "removed" ? (
        <div className="alert alert-warning"><span>This listing was removed and can&apos;t be edited.</span></div>
      ) : (
        <ProductForm key={`${product.id}-${product.updated_at}`} mode="edit" product={product} currency={user.currency} onSaved={reload} />
      )}

      <ConfirmDialog open={confirmRemove} title="Remove this listing?" text="It will no longer be visible to buyers. Orders already placed are not affected." confirmLabel="Remove listing" danger loading={busy} onConfirm={remove} onClose={() => setConfirmRemove(false)} />
    </div>
  );
}

export default function EditListingPage() {
  return (
    <RequireAuth>
      <SellerGate>
        <EditListing />
      </SellerGate>
    </RequireAuth>
  );
}
