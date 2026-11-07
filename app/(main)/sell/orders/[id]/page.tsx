"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, ImageOff, MapPin, MessageCircle, PackageCheck, PackageX, Truck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { useAuth } from "@/components/auth/AuthProvider";
import { refreshBadges } from "@/components/layout/useBadgeCounts";
import { startConversation } from "@/components/messages/startConversation";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { SellerOrderBadge } from "@/components/orders/StatusBadge";
import { SellerGate } from "@/components/sell/SellerGate";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { api, ApiError, formatMoney } from "@/lib/api";
import { pickupName, type SellerOrder } from "@/lib/orders";
import { formatDateTime } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const { data, loading, error, reload } = useApi<{ sellerOrder: SellerOrder }>(`/seller/orders/${id}`);
  const [busy, setBusy] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);

  if (loading && !data) return <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem]"><div className="skeleton h-96 rounded-lg" /><div className="skeleton h-64 rounded-lg" /></div>;

  const so = data?.sellerOrder;
  if (error || !so) {
    const missing = error instanceof ApiError && error.status === 404;
    return <EmptyState icon={<PackageX size={32} aria-hidden />} title={missing ? "We couldn't find that order" : "We couldn't load this order"} action={missing ? <ButtonLink href="/sell/orders">Back to orders</ButtonLink> : <Button onClick={reload}>Try again</Button>} />;
  }

  const act = async (kind: "ship" | "deliver") => {
    setBusy(true);
    try {
      await api.post(`/seller/orders/${so.id}/${kind}`);
      toast.success(kind === "ship" ? "Marked as shipped" : "Marked as delivered. The buyer has been asked to confirm.");
      setDeliverOpen(false);
      refreshBadges();
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the order");
    } finally {
      setBusy(false);
    }
  };

  const messageBuyer = async () => {
    const productId = so.items?.[0]?.product_id;
    if (!productId) return;
    setOpening(true);
    try {
      router.push(`/messages/${await startConversation(productId, so.buyer_id)}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't open the chat");
      setOpening(false);
    }
  };

  const pickup = pickupName(so.pickup_point);
  const net = so.seller_net_minor ?? so.settle_gross_minor;
  const open = so.refundRequests?.find((r) => r.status === "open");
  const feePct = so.fee_bps !== undefined ? so.fee_bps / 100 : null;

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/sell/orders" className="text-ink-soft">Orders to fulfil</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">{so.order_number}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1">Order {so.order_number}</h1>
          <p className="m-0 text-ink-soft">Placed {formatDateTime(so.created_at)} by {so.buyer_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {so.items?.[0] && <Button size="sm" variant="clay" loading={opening} onClick={messageBuyer} icon={<MessageCircle size={15} aria-hidden />}>Message buyer</Button>}
          <SellerOrderBadge status={so.status} />
        </div>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-5">
          <section className="card grid gap-5 p-5 sm:p-7" aria-label="Progress and items">
            <OrderTimeline so={so} paidAt={so.created_at} />

            {open && (
              <div className="alert alert-warning" role="status">
                <Undo2 size={18} aria-hidden />
                <span><strong>The buyer requested a refund{open.reason ? ` (${open.reason.replaceAll("_", " ")})` : ""}.</strong> Your payout is on hold while we review it.{open.details ? <> They said: &ldquo;{open.details}&rdquo;</> : null}</span>
              </div>
            )}
            {so.status === "delivered" && !so.buyer_confirmed_at && so.release_at && (
              <div className="alert alert-info" role="status"><PackageCheck size={18} aria-hidden /><span>Waiting for the buyer to confirm. If they don&apos;t, you&apos;re paid automatically on <strong>{formatDateTime(so.release_at)}</strong>.</span></div>
            )}
            {so.status === "delivered" && so.buyer_confirmed_at && so.release_at && (
              <div className="alert alert-info" role="status"><PackageCheck size={18} aria-hidden /><span>The buyer confirmed. Your payout is released on <strong>{formatDateTime(so.release_at)}</strong> unless a refund is requested.</span></div>
            )}
            {so.status === "completed" && <div className="alert alert-info" role="status"><PackageCheck size={18} aria-hidden /><span>Completed. Your earnings are in your available balance.</span></div>}

            <ul className="m-0 grid list-none gap-4 p-0">
              {so.items?.map((it) => (
                <li key={it.id} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-4">
                  <div className="grid size-16 place-items-center overflow-hidden rounded-md bg-surface-inset text-ink-faint">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff size={22} aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/products/${it.product_id}`} className="line-clamp-2 font-semibold text-ink no-underline hover:text-brand-700">{it.title}</Link>
                    <span className="text-[0.88rem] text-ink-soft">{it.quantity} × {formatMoney(it.unit_price_minor, user?.currency ?? "NGN")}</span>
                  </div>
                </li>
              ))}
            </ul>

            {pickup && <p className="m-0 flex items-center gap-2 text-[0.9rem] text-ink-soft"><MapPin size={16} aria-hidden />Buyer chose pickup at <strong className="text-ink">{pickup}</strong></p>}

            {(so.status === "paid" || so.status === "shipped") && (
              <div className="flex flex-wrap gap-3 border-t border-line pt-5">
                {so.status === "paid" && <Button variant="clay" loading={busy} onClick={() => act("ship")} icon={<Truck size={18} aria-hidden />}>Mark as shipped</Button>}
                <Button loading={busy} onClick={() => setDeliverOpen(true)} icon={<PackageCheck size={18} aria-hidden />}>Mark as delivered</Button>
              </div>
            )}
            {so.status === "paid" && <p className="m-0 flex items-start gap-2 text-[0.85rem] text-ink-soft"><AlertCircle size={15} className="mt-0.5 flex-none" aria-hidden />Shipping is optional. If you hand the item over in person, go straight to delivered.</p>}
          </section>
        </div>

        <aside className="card grid gap-4 p-5 sm:p-6 md:sticky md:top-36" aria-label="Payout summary">
          <h2 className="m-0 text-xl">Your payout</h2>
          <dl className="m-0 grid gap-3 text-[0.93rem]">
            <div className="flex justify-between gap-4"><dt className="text-ink-soft">Sale total</dt><dd className="m-0">{formatMoney(so.settle_gross_minor, so.settle_currency)}</dd></div>
            {so.fee_minor !== undefined && <div className="flex justify-between gap-4"><dt className="text-ink-soft">Ahia fee{feePct !== null ? ` (${feePct}%)` : ""}</dt><dd className="m-0">−{formatMoney(so.fee_minor, so.settle_currency)}</dd></div>}
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-lg"><dt className="font-bold">You receive</dt><dd className="price m-0">{formatMoney(net, so.settle_currency)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-soft">Paid in</dt><dd className="m-0">{so.settle_currency}</dd></div>
          </dl>
          <p className="m-0 rounded-md bg-brand-50 px-3.5 py-3 text-[0.85rem] text-ink-soft">Money stays in escrow until the buyer confirms and the refund window closes, or 7 days after you mark it delivered.</p>
        </aside>
      </div>

      <ConfirmDialog open={deliverOpen} title="Mark as delivered?" text="The buyer will be asked to confirm. If they don't, you're paid automatically after 7 days. Only continue once the item is in their hands." confirmLabel="Mark as delivered" loading={busy} onConfirm={() => act("deliver")} onClose={() => setDeliverOpen(false)} />
    </>
  );
}

export default function SellerOrderDetailPage() {
  return (
    <RequireAuth>
      <SellerGate>
        <Detail />
      </SellerGate>
    </RequireAuth>
  );
}
