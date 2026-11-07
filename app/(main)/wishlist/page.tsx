"use client";

import Link from "next/link";
import { Heart, ImageOff, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState } from "@/components/shop/ProductGrid";
import { useAddToCart } from "@/components/shop/useAddToCart";
import { useWishlist } from "@/components/shop/WishlistProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatMoney, type Currency } from "@/lib/api";
import { formatDate } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

interface WishItem {
  id: number;
  title: string;
  price_minor: number;
  currency: Currency;
  status: string;
  stock: number;
  added_at: string;
  image_url: string | null;
}

function Wishlist() {
  const { data, loading, error, reload } = useApi<{ items: WishItem[] }>("/wishlist");
  const { toggle } = useWishlist();
  const { add, busy } = useAddToCart();

  const remove = async (id: number) => {
    await toggle(id);
    reload();
  };

  const items = data?.items ?? [];

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-1">Saved items</h1>
        <p className="m-0 text-ink-soft">Things you want to come back to.</p>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-80 rounded-lg" />)}</div>
      ) : error && !data ? (
        <EmptyState icon={<Heart size={32} aria-hidden />} title="We couldn't load your saved items" action={<Button onClick={reload}>Try again</Button>} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Heart size={32} aria-hidden />} title="Nothing saved yet" text="Tap the heart on any product to keep it here." action={<ButtonLink href="/products">Browse products</ButtonLink>} />
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 sm:gap-5 md:grid-cols-4">
          {items.map((it) => {
            const available = it.status === "active" && it.stock > 0;
            return (
              <li key={it.id} className="card flex flex-col overflow-hidden">
                <Link href={`/products/${it.id}`} className="relative grid aspect-square place-items-center overflow-hidden bg-surface-inset text-ink-faint" aria-label={it.title} tabIndex={-1}>
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt="" loading="lazy" className={`size-full object-cover ${available ? "" : "opacity-60 grayscale"}`} />
                  ) : (
                    <ImageOff size={34} aria-hidden />
                  )}
                  {!available && <span className="absolute top-2.5 left-2.5 rounded-full bg-ink px-2.5 py-0.5 text-[0.72rem] font-bold text-white">{it.status === "active" ? "Sold out" : "Unavailable"}</span>}
                </Link>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <Link href={`/products/${it.id}`} className="line-clamp-2 min-h-[2.9em] text-[0.95rem] leading-snug font-semibold text-ink no-underline hover:text-brand-700">{it.title}</Link>
                  <div className="price text-[1.15rem]">{formatMoney(it.price_minor, it.currency)}</div>
                  <span className="text-[0.78rem] text-ink-faint">Saved {formatDate(it.added_at)}</span>
                  <div className="mt-auto flex gap-2 pt-3">
                    <Button size="sm" block disabled={!available || busy === it.id} onClick={() => add(it.id)} icon={busy === it.id ? <Loader2 className="spin" size={15} aria-hidden /> : <ShoppingCart size={15} aria-hidden />}>Add to cart</Button>
                    <button type="button" className="icon-btn size-10! text-danger!" onClick={() => remove(it.id)} aria-label={`Remove ${it.title} from saved items`}><Trash2 size={16} aria-hidden /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function WishlistPage() {
  return (
    <RequireAuth>
      <Wishlist />
    </RequireAuth>
  );
}
