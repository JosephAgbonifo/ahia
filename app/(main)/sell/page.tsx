"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Eye, EyeOff, ImageOff, Pencil, Plus, Store, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { SellerGate } from "@/components/sell/SellerGate";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { api, ApiError, formatMoney } from "@/lib/api";
import { cx } from "@/lib/cx";
import { CONDITION_LABEL, type ProductList, type ProductSummary } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const TABS = [
  { value: "", label: "All" },
  { value: "active", label: "Live" },
  { value: "draft", label: "Drafts" },
  { value: "sold_out", label: "Sold out" },
  { value: "removed", label: "Removed" },
];

const STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: "Live", tone: "badge-success" },
  draft: { label: "Draft", tone: "" },
  sold_out: { label: "Sold out", tone: "badge-warning" },
  removed: { label: "Removed", tone: "badge-danger" },
};

function Listings() {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "";
  const page = Number(sp.get("page")) || 1;
  const { data, loading, error, reload } = useApi<ProductList>("/products/mine", { status, page, limit: 12 });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toRemove, setToRemove] = useState<ProductSummary | null>(null);

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    router.replace(next.size ? `/sell?${next}` : "/sell", { scroll: false });
  };

  const setStatus = async (p: ProductSummary, next: "active" | "draft") => {
    setBusyId(p.id);
    try {
      await api.patch(`/products/${p.id}`, { status: next });
      toast.success(next === "active" ? "Your listing is live" : "Moved to drafts");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the listing");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!toRemove) return;
    setBusyId(toRemove.id);
    try {
      await api.delete(`/products/${toRemove.id}`);
      toast.success("Listing removed");
      setToRemove(null);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't remove the listing");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1">My listings</h1>
          <p className="m-0 text-ink-soft">Everything you&apos;re selling, in one place.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/sell/orders" variant="clay" size="lg" icon={<Truck size={18} aria-hidden />}>Orders to fulfil</ButtonLink>
          <ButtonLink href="/sell/new" size="lg" icon={<Plus size={18} aria-hidden />}>New listing</ButtonLink>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={status === t.value}
            onClick={() => go({ status: t.value })}
            className={cx(
              "rounded-full px-4 py-2 text-[0.9rem] font-bold transition",
              status === t.value ? "clay-brand" : "bg-surface text-ink-soft shadow-[var(--clay-out-sm)] hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState icon={<Store size={32} aria-hidden />} title="We couldn't load your listings" action={<Button onClick={reload}>Try again</Button>} />
      ) : !data?.products.length ? (
        <EmptyState
          icon={<Store size={32} aria-hidden />}
          title={status ? "Nothing here yet" : "You haven't listed anything yet"}
          text="Add photos, a price and a short description. It only takes a few minutes."
          action={<ButtonLink href="/sell/new">Create your first listing</ButtonLink>}
        />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-4 p-0">
            {data.products.map((p) => {
              const st = STATUS[p.status] ?? { label: p.status, tone: "" };
              const busy = busyId === p.id;
              return (
                <li key={p.id} className="card grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:p-5" aria-busy={busy}>
                  <div className="grid size-20 place-items-center overflow-hidden rounded-md bg-surface-inset text-ink-faint sm:size-26">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff size={26} aria-hidden />
                    )}
                  </div>

                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cx("badge", st.tone)}>{st.label}</span>
                      <span className="text-[0.82rem] text-ink-faint">{CONDITION_LABEL[p.condition_type]}</span>
                    </div>
                    <Link href={p.status === "active" ? `/products/${p.id}` : `/sell/${p.id}/edit`} className="line-clamp-2 font-semibold text-ink no-underline hover:text-brand-700">{p.title}</Link>
                    <div className="flex flex-wrap items-center gap-x-4 text-[0.88rem] text-ink-soft">
                      <span className="price text-base">{formatMoney(p.price_minor, p.currency)}</span>
                      <span>{p.stock} in stock</span>
                    </div>
                  </div>

                  <div className="col-span-full flex flex-wrap gap-2 sm:col-auto sm:justify-end">
                    <ButtonLink href={`/sell/${p.id}/edit`} size="sm" variant="clay" icon={<Pencil size={15} aria-hidden />}>Edit</ButtonLink>
                    {p.status === "draft" && <Button size="sm" loading={busy} onClick={() => setStatus(p, "active")} icon={<Eye size={15} aria-hidden />}>Publish</Button>}
                    {(p.status === "active" || p.status === "sold_out") && <Button size="sm" variant="clay" loading={busy} onClick={() => setStatus(p, "draft")} icon={<EyeOff size={15} aria-hidden />}>Unpublish</Button>}
                    {p.status !== "removed" && <Button size="sm" variant="ghost" onClick={() => setToRemove(p)} icon={<Trash2 size={15} aria-hidden />} className="text-danger!">Remove</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page.page} pages={data.page.pages} onChange={(n) => go({ page: String(n) })} />
        </>
      )}

      <ConfirmDialog
        open={!!toRemove}
        title="Remove this listing?"
        text={toRemove ? `"${toRemove.title}" will no longer be visible to buyers. Orders already placed are not affected.` : ""}
        confirmLabel="Remove listing"
        danger
        loading={busyId === toRemove?.id}
        onConfirm={remove}
        onClose={() => setToRemove(null)}
      />
    </>
  );
}

export default function SellPage() {
  return (
    <RequireAuth>
      <SellerGate>
        <Suspense fallback={null}>
          <Listings />
        </Suspense>
      </SellerGate>
    </RequireAuth>
  );
}
