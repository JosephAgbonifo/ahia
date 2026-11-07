"use client";

import Link from "next/link";
import { Heart, ImageOff, Loader2, ShoppingCart } from "lucide-react";
import { formatMoney } from "@/lib/api";
import { CONDITION_LABEL, type ProductSummary } from "@/lib/shop";
import { useWishlist } from "./WishlistProvider";
import { useAddToCart } from "./useAddToCart";

export function ProductCard({ product }: { product: ProductSummary }) {
  const { has, toggle } = useWishlist();
  const { add, busy } = useAddToCart();
  const saved = has(product.id);
  const href = `/products/${product.id}`;
  const soldOut = product.stock <= 0;

  return (
    <article className="card relative flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgb(60_30_15/0.05),0_16px_32px_rgb(60_30_15/0.1)]">
      <Link href={href} className="relative grid aspect-square place-items-center overflow-hidden bg-surface-inset text-ink-faint" aria-label={product.title} tabIndex={-1}>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <ImageOff size={36} aria-hidden />
        )}
        <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[0.72rem] font-bold text-ink-soft shadow-sm">
          {CONDITION_LABEL[product.condition_type]}
        </span>
      </Link>

      <button
        type="button"
        className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-white/95 text-ink-soft shadow hover:text-danger aria-pressed:text-danger aria-pressed:*:fill-current"
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.title} from saved items` : `Save ${product.title}`}
        onClick={() => toggle(product.id)}
      >
        <Heart size={18} aria-hidden />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-3.5 pb-4">
        <Link href={href} className="line-clamp-2 min-h-[2.9em] text-[0.95rem] leading-snug font-semibold text-ink no-underline hover:text-brand-700">
          {product.title}
        </Link>
        <div className="price text-[1.2rem]">{formatMoney(product.price_minor, product.currency)}</div>
        <div className="text-[0.8rem] text-ink-faint">
          {soldOut ? (
            <span className="font-bold text-danger">Sold out</span>
          ) : product.stock <= 3 ? (
            <span className="font-bold text-danger">Only {product.stock} left</span>
          ) : (
            product.university_short_name ?? product.university_name
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="min-w-0 truncate text-[0.82rem] text-ink-soft">{product.seller_name}</span>
          <button
            type="button"
            className="grid size-10 flex-none place-items-center rounded-full bg-linear-to-br from-brand-300 to-brand-500 text-on-primary shadow-[3px_4px_8px_rgb(217_119_87/0.35),inset_2px_2px_3px_rgb(255_255_255/0.5)] hover:brightness-105 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
            disabled={soldOut || busy === product.id}
            onClick={() => add(product.id)}
            aria-label={`Add ${product.title} to cart`}
          >
            {busy === product.id ? <Loader2 className="spin" size={18} aria-hidden /> : <ShoppingCart size={18} aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  );
}
