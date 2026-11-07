"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BadgeCheck, ChevronRight, Flag, Heart, ImageOff, Lock, MapPin, Minus, PackageX, Plus, Send, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Stars } from "@/components/shop/Stars";
import { startConversation } from "@/components/messages/startConversation";
import { useAddToCart } from "@/components/shop/useAddToCart";
import { useWishlist } from "@/components/shop/WishlistProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api, ApiError, formatMoney } from "@/lib/api";
import { cx } from "@/lib/cx";
import { CONDITION_LABEL, formatDate, type ProductDetail, type Review } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const STEPPER =
  "inline-flex items-center rounded-md bg-surface-inset shadow-[var(--clay-pressed)] [&_button]:grid [&_button]:size-10 [&_button]:place-items-center [&_button]:rounded-md [&_button]:border-0 [&_button]:bg-transparent [&_button:hover:not(:disabled)]:bg-brand-50 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-40 [&_output]:min-w-9 [&_output]:text-center [&_output]:font-extrabold";

function Gallery({ images, title }: { images: ProductDetail["images"]; title: string }) {
  const [i, setI] = useState(0);
  const current = images[i];
  return (
    <div className="card grid gap-3.5 p-4.5">
      <div className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-surface-inset text-ink-faint">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={title} className="size-full object-contain" />
        ) : (
          <ImageOff size={56} aria-hidden />
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto p-1">
          {images.map((img, idx) => (
            <button key={img.id} type="button" className="size-18 flex-none overflow-hidden rounded-md border-2 border-transparent bg-surface-inset p-0 aria-[current=true]:border-brand-500" aria-current={idx === i} aria-label={`Show image ${idx + 1}`} onClick={() => setI(idx)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AskSeller({ productId }: { productId: number }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const convoId = await startConversation(productId, undefined, text.trim());
      toast.success("Message sent");
      setText("");
      setOpen(false);
      router.push(`/messages/${convoId}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't send your message");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="clay"
        block
        onClick={() => (user ? setOpen(true) : router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`))}
      >
        Ask the seller a question
      </Button>
    );
  }
  return (
    <div className="grid gap-2.5 [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-md [&_textarea]:border-0 [&_textarea]:bg-surface-inset [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:shadow-[var(--clay-pressed)] [&_textarea]:outline-none [&_textarea:focus]:shadow-[var(--clay-pressed),0_0_0_3px_rgb(229_137_99/0.5)]">
      <label className="sr-only" htmlFor="ask">Your message</label>
      <textarea id="ask" value={text} maxLength={2000} placeholder="Is it still available? Where can we meet?" onChange={(e) => setText(e.target.value)} />
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button block loading={sending} disabled={!text.trim()} onClick={send} icon={<Send size={16} aria-hidden />}>Send message</Button>
      </div>
    </div>
  );
}

function Reviews({ productId }: { productId: number }) {
  const { data, loading } = useApi<{ reviews: Review[]; summary: { count: number; average: number | null } }>(`/products/${productId}/reviews`, { limit: 10 });
  return (
    <section className="card p-5 sm:p-8" aria-labelledby="reviews-h">
      <h2 id="reviews-h" className="mb-4 text-xl">Customer reviews</h2>
      {loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : !data?.reviews.length ? (
        <p className="text-muted" style={{ margin: 0 }}>No reviews yet. Reviews appear after buyers receive this item.</p>
      ) : (
        <>
          <div className="mb-5 flex items-center gap-4">
            <span className="font-heading text-4xl leading-none font-extrabold">{data.summary.average?.toFixed(1)}</span>
            <div><Stars value={data.summary.average} size={20} /><div className="text-muted" style={{ fontSize: "0.88rem" }}>{data.summary.count} review{data.summary.count === 1 ? "" : "s"}</div></div>
          </div>
          <div className="grid gap-4">
            {data.reviews.map((r) => (
              <article key={r.id} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2.5"><Stars value={r.rating} /><strong className="text-[0.95rem]">{r.reviewer_name}</strong><small className="text-ink-faint">{formatDate(r.created_at)}</small></div>
                {r.body && <p className="m-0 text-ink-soft">{r.body}</p>}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const { add, busy } = useAddToCart();
  const [qty, setQty] = useState(1);
  const [reportOpen, setReportOpen] = useState(false);

  const { data, loading, error, reload } = useApi<{ product: ProductDetail }>(`/products/${id}`);
  const product = data?.product;

  if (loading) {
    return (
      <div className="grid items-start gap-6 md:grid-cols-[5fr_6fr]">
        <div className="skeleton" style={{ aspectRatio: "1 / 1", borderRadius: 22 }} />
        <div className="skeleton" style={{ height: "28rem", borderRadius: 22 }} />
      </div>
    );
  }

  if (error || !product) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <EmptyState
        icon={<PackageX size={32} aria-hidden />}
        title={notFound ? "This item isn't available" : "We couldn't load this item"}
        text={notFound ? "It may have been removed, or it's listed on another campus." : "Check your connection and try again."}
        action={notFound ? <ButtonLink href="/products">Browse products</ButtonLink> : <Button onClick={reload}>Try again</Button>}
      />
    );
  }

  const own = user?.id === product.seller_id;
  const soldOut = product.stock <= 0 || product.status !== "active";
  const saved = has(product.id);

  const buyNow = async () => {
    if (await add(product.id, qty)) router.push("/cart");
  };

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[0.9rem] text-ink-soft [&_a]:text-ink-soft [&_a]:no-underline [&_a:hover]:text-brand-700 [&_a:hover]:underline" aria-label="Breadcrumb">
        <Link href="/">Home</Link><ChevronRight size={14} aria-hidden />
        <Link href={`/products?category=${product.category_id}`}>{product.category_name}</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page" className="line-clamp-2">{product.title}</span>
      </nav>

      <div className="grid items-start gap-6 md:grid-cols-[5fr_6fr]">
        <Gallery images={product.images} title={product.title} />

        <div className="card grid gap-5 p-5 sm:p-8">
          <div style={{ display: "grid", gap: "0.7rem" }}>
            <h1 className="m-0 text-[clamp(1.4rem,2.6vw,1.9rem)] leading-snug">{product.title}</h1>
            <div className="flex flex-wrap items-center gap-2.5 text-[0.9rem] text-ink-soft">
              <Stars value={product.seller_rating} />
              <span>{product.seller_review_count} seller review{product.seller_review_count === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="price text-[clamp(1.8rem,3.5vw,2.4rem)]">{formatMoney(product.price_minor, product.currency)}</div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-brand">{CONDITION_LABEL[product.condition_type]}</span>
            <span className="badge"><MapPin size={12} aria-hidden />{product.university_short_name ?? product.university_name}</span>
            <span className={`text-[0.92rem] font-bold ${soldOut || product.stock <= 3 ? "text-danger" : "text-success"}`}>
              {soldOut ? "Sold out" : product.stock <= 3 ? `Only ${product.stock} left` : "In stock"}
            </span>
          </div>

          <div className="grid gap-4 border-t border-line pt-5">
            {own ? (
              <div className="alert alert-info items-center justify-between"><span>This is your listing. Buyers see the Buy buttons here.</span><ButtonLink href={`/sell/${product.id}/edit`} size="sm" variant="clay">Edit listing</ButtonLink></div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-[0.92rem] font-bold">Quantity</span>
                  <div className={STEPPER}>
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1 || soldOut} aria-label="Decrease quantity"><Minus size={16} aria-hidden /></button>
                    <output aria-live="polite">{qty}</output>
                    <button type="button" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} disabled={qty >= product.stock || soldOut} aria-label="Increase quantity"><Plus size={16} aria-hidden /></button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button size="lg" disabled={soldOut} loading={busy === product.id} onClick={() => add(product.id, qty)} icon={<ShoppingCart size={18} aria-hidden />}>Add to cart</Button>
                  <Button size="lg" variant="clay" disabled={soldOut} onClick={buyNow} icon={<Zap size={18} aria-hidden />}>Buy now</Button>
                </div>
              </>
            )}
            <Button variant="ghost" onClick={() => toggle(product.id)} aria-pressed={saved} icon={<Heart size={18} aria-hidden fill={saved ? "currentColor" : "none"} />}>
              {saved ? "Saved" : "Save for later"}
            </Button>
          </div>

          <div className="clay-inset grid gap-3 px-4.5 py-4 [&_div]:flex [&_div]:items-start [&_div]:gap-3 [&_div]:text-[0.9rem] [&_div]:text-ink-soft [&_svg]:mt-0.5 [&_svg]:flex-none [&_svg]:text-success">
            <div><Lock size={18} aria-hidden /><span><strong>Protected by escrow.</strong> The seller is paid after you confirm the item.</span></div>
            <div><BadgeCheck size={18} aria-hidden /><span><strong>Refund window.</strong> Request a refund if it isn&apos;t as described.</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr] md:items-start">
        <div className="grid gap-6">
          <section className="card p-5 sm:p-8" aria-labelledby="desc-h">
            <h2 id="desc-h" className="mb-4 text-xl">Description</h2>
            <p className="m-0 whitespace-pre-line text-ink-soft">{product.description || "The seller hasn't added a description."}</p>
          </section>
          <Reviews productId={product.id} />
        </div>

        <aside className="card grid gap-4 p-5" aria-label="Seller">
          <div className="flex items-center gap-3.5">
            <span className="grid size-13 place-items-center overflow-hidden rounded-full bg-linear-to-br from-brand-300 to-brand-500 font-heading font-extrabold text-on-primary">
              {product.seller_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.seller_avatar} alt="" className="size-full object-cover" />
              ) : (
                product.seller_name[0]
              )}
            </span>
            <div>
              <strong className="block font-heading">{product.seller_name}</strong>
              <span className="text-[0.88rem] text-ink-soft">{product.university_name}</span>
            </div>
          </div>
          {product.seller_kyc_status === "approved" && <span className="badge badge-success" style={{ justifySelf: "start" }}><BadgeCheck size={14} aria-hidden />Verified seller</span>}
          {!own && <AskSeller productId={product.id} />}
          {!own && (
            <Button variant="ghost" size="sm" onClick={() => (user ? setReportOpen(true) : router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`))} icon={<Flag size={15} aria-hidden />}>
              Report this listing
            </Button>
          )}
        </aside>
      </div>
      <ReportDialog open={reportOpen} targetType="product" targetId={product.id} subject="this listing" onClose={() => setReportOpen(false)} />
    </>
  );
}
