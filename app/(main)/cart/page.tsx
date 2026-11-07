"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ImageOff, Lock, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { refreshBadges } from "@/components/layout/useBadgeCounts";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api, ApiError, formatMoney } from "@/lib/api";
import { cx } from "@/lib/cx";
import { lockDurationMs, saveXrpSession, type XamanRequest } from "@/lib/xrp";
import type { Cart } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const STEPPER =
  "inline-flex items-center rounded-md bg-surface-inset shadow-[var(--clay-pressed)] [&_button]:grid [&_button]:size-9.5 [&_button]:place-items-center [&_button]:rounded-md [&_button]:border-0 [&_button]:bg-transparent [&_button:hover:not(:disabled)]:bg-brand-50 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-40 [&_output]:min-w-9 [&_output]:text-center [&_output]:font-extrabold";
const LABEL = "mb-1.5 block text-[0.9rem] font-bold";
const METHOD = "flex cursor-pointer items-start gap-3 rounded-md bg-surface-inset px-3.5 py-3 shadow-[var(--clay-pressed)] [&>input]:mt-1 [&>input]:accent-brand-600";

function CartContent() {
  const { data, loading, error, reload } = useApi<{ cart: Cart }>("/cart");
  const pickups = useApi<{ pickupPoints: { id: number; name: string; description: string | null }[] }>("/pickup-points");
  const [cart, setCart] = useState<Cart | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [pickup, setPickup] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [method, setMethod] = useState<"fiat" | "rlusd">("fiat");
  const router = useRouter();

  useEffect(() => {
    if (data) setCart(data.cart);
  }, [data]);

  const run = async (productId: number, fn: () => Promise<{ cart: Cart }>) => {
    setPending(productId);
    try {
      setCart((await fn()).cart);
      refreshBadges();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update your cart");
    } finally {
      setPending(null);
    }
  };

  const setQty = (id: number, quantity: number) => run(id, () => api.patch(`/cart/items/${id}`, { quantity }));
  const remove = (id: number) => run(id, () => api.delete(`/cart/items/${id}`));

  const checkout = async (chosen: "fiat" | "rlusd") => {
    setCheckingOut(true);
    try {
      const res = await api.post<{
        order: { id: number; created_at?: string };
        payment: { authorizationUrl?: string; amountRlusd?: string; amountMinor?: number; issuer?: string; currency?: string; destination?: string; destinationTag?: number; expiresAt: string; xaman?: XamanRequest };
      }>("/orders/checkout", {
        paymentMethod: chosen,
        ...(pickup ? { pickupPointId: Number(pickup) } : {}),
      });
      if (chosen === "fiat" && res.payment.authorizationUrl) {
        window.location.assign(res.payment.authorizationUrl); // Paystack; returns to /orders/:id/payment-result
        return;
      }
      const p = res.payment;
      saveXrpSession({
        orderId: res.order.id,
        amountRlusd: p.amountRlusd ?? String((p.amountMinor ?? 0) / 1_000_000),
        amountMinor: p.amountMinor ?? 0,
        issuer: p.issuer ?? "",
        currency: p.currency ?? "RLUSD",
        destination: p.destination ?? "",
        destinationTag: p.destinationTag ?? res.order.id,
        expiresAt: p.expiresAt,
        localExpiry: Date.now() + lockDurationMs(res.order.created_at, p.expiresAt),
        xaman: p.xaman as XamanRequest,
      });
      router.push(`/orders/${res.order.id}/pay`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't start checkout");
      setCheckingOut(false);
    }
  };

  if (loading && !cart) {
    return (
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="skeleton h-80 rounded-lg" />
        <div className="skeleton h-80 rounded-lg" />
      </div>
    );
  }

  if (error && !cart) {
    return <EmptyState icon={<AlertCircle size={32} aria-hidden />} title="We couldn't load your cart" action={<Button onClick={reload}>Try again</Button>} />;
  }

  if (!cart || cart.itemCount === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart size={32} aria-hidden />}
        title="Your cart is empty"
        text="Find something you like and add it here."
        action={<ButtonLink href="/products">Start shopping</ButtonLink>}
      />
    );
  }

  const fiatOk = cart.currency === "NGN";
  const chosen = method === "fiat" && !fiatOk ? "rlusd" : method; // card payments only exist for naira
  const canCheckout = !cart.hasIssues;

  return (
    <>
      <h1 className="mb-5">Shopping cart <span className="text-base font-semibold text-ink-soft">({cart.itemCount} item{cart.itemCount === 1 ? "" : "s"})</span></h1>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-5">
          {cart.sellers.map((s) => (
            <section key={s.sellerId} className="card p-4 sm:p-6" aria-label={`Items from ${s.sellerName}`}>
              <div className="mb-1.5 flex items-center justify-between gap-4 border-b border-line pb-3.5">
                <strong className="font-heading">Sold by {s.sellerName}</strong>
                <span className="text-muted">Subtotal {formatMoney(s.subtotalMinor, cart.currency)}</span>
              </div>
              {s.items.map((it) => (
                <div key={it.productId} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4.5 gap-y-3.5 border-b border-line py-4.5 last:border-b-0 last:pb-1 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center" aria-busy={pending === it.productId}>
                  <Link href={`/products/${it.productId}`} className="grid size-20 place-items-center overflow-hidden rounded-md bg-surface-inset text-ink-faint sm:size-24" tabIndex={-1} aria-hidden>
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff size={24} />
                    )}
                  </Link>
                  <div className="grid min-w-0 gap-1.5">
                    <Link href={`/products/${it.productId}`} className="line-clamp-2 font-semibold text-ink no-underline hover:text-brand-700">{it.title}</Link>
                    <span className="text-[0.88rem] text-ink-soft">{formatMoney(it.unitPriceMinor, cart.currency)} each</span>
                    {it.issue && (
                      <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-bold text-danger">
                        <AlertCircle size={14} aria-hidden />
                        {it.issue === "unavailable" ? "No longer available. Remove it to continue." : `Only ${it.availableStock} in stock. Lower the quantity.`}
                      </span>
                    )}
                  </div>
                  <div className="col-span-full flex items-center justify-between gap-4 sm:col-auto sm:flex-col sm:items-end">
                    <span className="price text-[1.05rem]">{formatMoney(it.lineTotalMinor, cart.currency)}</span>
                    <div className={STEPPER}>
                      <button type="button" onClick={() => setQty(it.productId, it.quantity - 1)} disabled={it.quantity <= 1 || pending === it.productId} aria-label={`Decrease quantity of ${it.title}`}><Minus size={16} aria-hidden /></button>
                      <output aria-live="polite">{it.quantity}</output>
                      <button type="button" onClick={() => setQty(it.productId, it.quantity + 1)} disabled={it.quantity >= it.availableStock || pending === it.productId} aria-label={`Increase quantity of ${it.title}`}><Plus size={16} aria-hidden /></button>
                    </div>
                    <button type="button" className="inline-flex items-center gap-1.5 border-0 bg-transparent text-[0.88rem] font-semibold text-ink-soft hover:text-danger" onClick={() => remove(it.productId)} disabled={pending === it.productId}><Trash2 size={15} aria-hidden />Remove</button>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>

        <aside className="card grid gap-4.5 p-5 sm:p-7 md:sticky md:top-36" aria-label="Order summary">
          <h2 className="m-0 text-xl">Order summary</h2>
          <div className="flex justify-between gap-4"><span className="text-ink-soft">Items ({cart.itemCount})</span><span>{formatMoney(cart.subtotalMinor, cart.currency)}</span></div>
          <div className="flex justify-between gap-4 border-t border-line pt-4 text-xl"><strong>Total</strong><strong className="price">{formatMoney(cart.subtotalMinor, cart.currency)}</strong></div>

          {(pickups.data?.pickupPoints.length ?? 0) > 0 && (
            <div>
              <label className={LABEL} htmlFor="pickup">Campus pickup point</label>
              <select id="pickup" className="min-h-12 w-full rounded-md border-0 bg-surface-inset px-3.5 shadow-[var(--clay-pressed)]" value={pickup} onChange={(e) => setPickup(e.target.value)}>
                <option value="">Choose later</option>
                {pickups.data?.pickupPoints.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className={LABEL}>Pay with</legend>
            <div className="grid gap-2.5">
              <label className={cx(METHOD, !fiatOk && "cursor-not-allowed opacity-55")}>
                <input type="radio" name="pay" checked={chosen === "fiat"} disabled={!fiatOk} onChange={() => setMethod("fiat")} />
                <div><strong className="block text-[0.93rem]">Card or bank transfer</strong><span className="text-[0.82rem] text-ink-soft">{fiatOk ? "Secure checkout with Paystack" : "Not available for CAD yet"}</span></div>
              </label>
              <label className={METHOD}>
                <input type="radio" name="pay" checked={chosen === "rlusd"} onChange={() => setMethod("rlusd")} />
                <div><strong className="block text-[0.93rem]">RLUSD (Xaman)</strong><span className="text-[0.82rem] text-ink-soft">A US dollar stablecoin on the XRP Ledger. You&apos;ll see the exact amount next, and the price is locked for 5 minutes.</span></div>
              </label>
              {chosen === "rlusd" && (
                <p className="m-0 rounded-md bg-brand-50 px-3.5 py-3 text-[0.82rem] text-ink-soft">
                  You&apos;ll sign the payment in the Xaman app, so your wallet needs enough RLUSD and a trust line to the RLUSD issuer (Xaman guides you if it&apos;s missing). Connecting a wallet in <Link href="/settings" className="font-bold">Settings</Link> is optional. Wallets you pay from are saved automatically.
                </p>
              )}
            </div>
          </fieldset>

          {cart.hasIssues && <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><span>Fix the highlighted items before checking out.</span></div>}

          <Button size="lg" block disabled={!canCheckout} loading={checkingOut} onClick={() => checkout(chosen)} icon={<Lock size={18} aria-hidden />}>
            {chosen === "rlusd" ? "Continue to RLUSD payment" : "Checkout securely"}
          </Button>
          <p className="m-0 text-center text-[0.82rem] text-ink-soft">Your payment is held until you confirm the item.</p>
        </aside>
      </div>
    </>
  );
}

export default function CartPage() {
  return (
    <RequireAuth>
      <CartContent />
    </RequireAuth>
  );
}
