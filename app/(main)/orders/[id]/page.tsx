"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, Clock, PackageX, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { BuyerSellerOrder } from "@/components/orders/BuyerSellerOrder";
import { OrderBadge } from "@/components/orders/StatusBadge";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { api, ApiError, formatMoney } from "@/lib/api";
import type { OrderDetail, SellerOrder } from "@/lib/orders";
import { formatDateTime } from "@/lib/shop";
import { isLedgerPayment, loadXrpSession, paymentMethodName } from "@/lib/xrp";
import { useApi } from "@/lib/useApi";

function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, reload } = useApi<{ order: OrderDetail }>(`/orders/${id}`);
  const [checking, setChecking] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [canResume, setCanResume] = useState(false);
  useEffect(() => {
    const sess = loadXrpSession(id);
    setCanResume(!!sess && sess.localExpiry > Date.now());
  }, [id]);

  if (loading && !data) return <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem]"><div className="skeleton h-96 rounded-lg" /><div className="skeleton h-64 rounded-lg" /></div>;

  const order = data?.order;
  if (error || !order) {
    const missing = error instanceof ApiError && error.status === 404;
    return <EmptyState icon={<PackageX size={32} aria-hidden />} title={missing ? "We couldn't find that order" : "We couldn't load this order"} action={missing ? <ButtonLink href="/orders">Back to my orders</ButtonLink> : <Button onClick={reload}>Try again</Button>} />;
  }

  const unpaid = order.status === "pending_payment";
  const paymentLabel = paymentMethodName(order.payment_method);

  const checkPayment = async () => {
    setChecking(true);
    try {
      const r = await api.get<{ status: string }>(`/orders/${order.id}/payment`);
      if (r.status === "paid") toast.success("Payment confirmed");
      else if (r.status === "pending_payment") toast.info("We haven't received your payment yet.");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't check the payment");
    } finally {
      setChecking(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/orders/${order.id}/cancel`);
      toast.success("Order cancelled");
      setCancelOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't cancel the order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/orders" className="text-ink-soft">My orders</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">{order.order_number}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1">Order {order.order_number}</h1>
          <p className="m-0 text-ink-soft">Placed {formatDateTime(order.created_at)}</p>
        </div>
        <OrderBadge status={order.status} />
      </div>

      {unpaid && (
        <div className="alert alert-warning mb-6 flex-wrap items-center justify-between" role="status">
          <span className="flex items-start gap-2.5"><Clock size={18} aria-hidden className="mt-0.5" /><span><strong>Waiting for payment.</strong> If you already paid, check the status. Unpaid orders expire and your items go back on sale.</span></span>
          <span className="flex flex-wrap gap-2">
            {isLedgerPayment(order.payment_method) && canResume && <ButtonLink href={`/orders/${order.id}/pay`} size="sm">Resume RLUSD payment</ButtonLink>}
            <Button size="sm" variant="clay" loading={checking} onClick={checkPayment} icon={<RefreshCw size={15} aria-hidden />}>Check payment</Button>
            <Button size="sm" variant="ghost" className="text-danger!" onClick={() => setCancelOpen(true)}>Cancel order</Button>
          </span>
        </div>
      )}
      {(order.status === "cancelled" || order.status === "expired") && (
        <div className="alert alert-info mb-6"><AlertCircle size={18} aria-hidden /><span>This order was {order.status === "expired" ? "not paid in time" : "cancelled"}. You haven&apos;t been charged. <Link href="/cart">Back to your cart</Link></span></div>
      )}

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-5">
          {order.sellerOrders.map((so: SellerOrder) => (
            <BuyerSellerOrder key={so.id} so={so} priceCurrency={order.price_currency} paidAt={order.paid_at} onChanged={reload} />
          ))}
        </div>

        <aside className="card grid gap-4 p-5 sm:p-6 md:sticky md:top-36" aria-label="Order summary">
          <h2 className="m-0 text-xl">Summary</h2>
          <dl className="m-0 grid gap-3 text-[0.93rem]">
            <div className="flex justify-between gap-4"><dt className="text-ink-soft">Items</dt><dd className="m-0">{formatMoney(order.subtotal_minor, order.price_currency)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-lg"><dt className="font-bold">Total paid</dt><dd className="price m-0">{formatMoney(order.total_paid_minor, order.payment_currency)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-soft">Payment</dt><dd className="m-0 text-right">{paymentLabel}</dd></div>
            {order.paid_at && <div className="flex justify-between gap-4"><dt className="text-ink-soft">Paid on</dt><dd className="m-0 text-right">{formatDateTime(order.paid_at)}</dd></div>}
          </dl>
          <p className="m-0 rounded-md bg-brand-50 px-3.5 py-3 text-[0.85rem] text-ink-soft">Your money is held in escrow. Sellers are paid only after you confirm, or after the refund window.</p>
        </aside>
      </div>

      <ConfirmDialog open={cancelOpen} title="Cancel this order?" text="Your items go back on sale and nothing is charged. You can check out again from your cart." confirmLabel="Cancel order" danger loading={cancelling} onConfirm={cancel} onClose={() => setCancelOpen(false)} />
    </>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <OrderPage />
    </RequireAuth>
  );
}
