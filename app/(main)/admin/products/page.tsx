"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, ImageOff, PackageSearch, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { api, ApiError, formatMoney, type Currency } from "@/lib/api";
import { cx } from "@/lib/cx";
import type { ProductDetail, ProductList } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

interface Row {
  id: number;
  title: string;
  price_minor: number;
  currency: Currency;
  status: string;
  seller_name: string;
  university: string;
  image: string | null;
}

const TONE: Record<string, string> = { active: "badge-success", draft: "", sold_out: "badge-warning", removed: "badge-danger" };
const LABEL: Record<string, string> = { active: "Live", draft: "Draft", sold_out: "Sold out", removed: "Removed" };

function Products() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const isId = /^\d+$/.test(term);

  const byId = useApi<{ product: ProductDetail }>(isId ? `/products/${term}` : null);
  const search = useApi<ProductList>(term && !isId ? "/products" : null, { q: term, limit: 20 });

  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [target, setTarget] = useState<{ row: Row; next: "active" | "removed" } | null>(null);
  const [busy, setBusy] = useState(false);

  const rows: Row[] = isId
    ? byId.data
      ? [{ id: byId.data.product.id, title: byId.data.product.title, price_minor: byId.data.product.price_minor, currency: byId.data.product.currency, status: byId.data.product.status, seller_name: byId.data.product.seller_name, university: byId.data.product.university_short_name ?? byId.data.product.university_name, image: byId.data.product.images[0]?.url ?? null }]
      : []
    : (search.data?.products ?? []).map((p) => ({ id: p.id, title: p.title, price_minor: p.price_minor, currency: p.currency, status: p.status, seller_name: p.seller_name, university: p.university_short_name ?? p.university_name, image: p.image_url }));

  const loading = term ? (isId ? byId.loading : search.loading) : false;
  const error = term ? (isId ? byId.error : search.error) : null;

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setOverrides({});
    setTerm(input.trim());
  };

  const moderate = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api.patch(`/admin/products/${target.row.id}`, { status: target.next });
      setOverrides((o) => ({ ...o, [target.row.id]: target.next }));
      toast.success(target.next === "removed" ? "Listing removed from the store" : "Listing restored");
      setTarget(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the listing");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">Products</span>
      </nav>
      <h1 className="mb-1">Product moderation</h1>
      <p className="mb-6 max-w-2xl text-ink-soft">Look up a listing by its ID (for example from a report), or search live items. Searching only shows your own university, but an ID works for any listing.</p>

      <form onSubmit={onSearch} className="mb-6 flex flex-wrap gap-3" role="search">
        <div className="input-wrap min-w-64 flex-1" data-icon="true">
          <Search className="input-icon" size={18} aria-hidden />
          <input className="input-el" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Product ID or words in the title" aria-label="Product ID or search words" />
        </div>
        <Button type="submit" size="lg" disabled={!input.trim()}>Find</Button>
      </form>

      {!term ? (
        <EmptyState icon={<PackageSearch size={32} aria-hidden />} title="Find a listing" text="Enter an ID like 42, or search by title." />
      ) : loading ? (
        <div className="grid gap-3" aria-busy="true">{[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState icon={<PackageSearch size={32} aria-hidden />} title={error instanceof ApiError && error.status === 404 ? "No listing with that ID" : "We couldn't search right now"} text={error instanceof ApiError && error.status === 404 ? "Check the number and try again." : undefined} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<PackageSearch size={32} aria-hidden />} title="Nothing found" text="Try other words from the title." />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {rows.map((r) => {
            const status = overrides[r.id] ?? r.status;
            return (
              <li key={r.id} className="card grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:p-5">
                <div className="grid size-18 place-items-center overflow-hidden rounded-md bg-surface-inset text-ink-faint sm:size-20">
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageOff size={24} aria-hidden />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2"><span className={cx("badge", TONE[status])}>{LABEL[status] ?? status}</span><span className="text-[0.8rem] text-ink-faint">#{r.id}</span></div>
                  <strong className="line-clamp-2 font-heading">{r.title}</strong>
                  <span className="text-[0.85rem] text-ink-soft">{formatMoney(r.price_minor, r.currency)} · {r.seller_name} · {r.university}</span>
                </div>
                <div className="col-span-full flex flex-wrap gap-2 sm:col-auto sm:justify-end">
                  <Link href={`/products/${r.id}`} className="btn btn-clay btn-sm" target="_blank"><ExternalLink size={14} aria-hidden />View</Link>
                  {status === "removed" ? (
                    <Button size="sm" onClick={() => setTarget({ row: r, next: "active" })} icon={<RotateCcw size={14} aria-hidden />}>Restore</Button>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => setTarget({ row: r, next: "removed" })} icon={<Trash2 size={14} aria-hidden />}>Remove</Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!target}
        title={target?.next === "removed" ? "Remove this listing?" : "Restore this listing?"}
        text={target ? (target.next === "removed" ? `"${target.row.title}" will disappear from the store. Existing orders keep their copy of the item.` : `"${target.row.title}" will go back live in the store.`) : ""}
        confirmLabel={target?.next === "removed" ? "Remove listing" : "Restore listing"}
        danger={target?.next === "removed"}
        loading={busy}
        onConfirm={moderate}
        onClose={() => setTarget(null)}
      />
    </>
  );
}

export default function AdminProductsPage() {
  return (
    <RequireAuth role="admin">
      <Products />
    </RequireAuth>
  );
}
