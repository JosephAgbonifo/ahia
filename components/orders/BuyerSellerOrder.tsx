"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ImageOff, MapPin, MessageCircle, PackageCheck, Star, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { startConversation } from "@/components/messages/startConversation";
import { StarInput } from "@/components/shop/Stars";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { api, ApiError, formatMoney, type Currency } from "@/lib/api";
import { pickupName, REFUND_REASONS, refundWindowOpen, type OrderItem, type SellerOrder } from "@/lib/orders";
import { formatDateTime } from "@/lib/shop";
import { OrderTimeline } from "./OrderTimeline";
import { SellerOrderBadge } from "./StatusBadge";

interface Props {
  so: SellerOrder;
  priceCurrency: Currency;
  paidAt: string | null;
  onChanged: () => void;
}

function RefundDialog({ so, open, onClose, onDone }: { so: SellerOrder; open: boolean; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/orders/seller-orders/${so.id}/refund`, { reason, ...(details.trim() ? { details: details.trim() } : {}) });
      toast.success("Refund requested. The seller's payout is on hold while we review.");
      onClose();
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't send your request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Request a refund">
      <p className="mb-4 text-ink-soft">Tell us what went wrong. Our team reviews every request and the seller&apos;s payout is paused until we decide.</p>
      <fieldset className="mb-4 grid gap-2 border-0 p-0">
        <legend className="label mb-1.5">Reason</legend>
        {REFUND_REASONS.map((r) => (
          <label key={r.value} className="clay-inset flex cursor-pointer items-center gap-3 px-3.5 py-3 text-[0.93rem] [&>input]:accent-brand-600">
            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
            {r.label}
          </label>
        ))}
      </fieldset>
      <label className="label" htmlFor="refund-details">More details <span className="label-optional">(optional)</span></label>
      <div className="input-wrap mt-1.5 items-stretch">
        <textarea id="refund-details" className="input-el min-h-24 resize-y" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button loading={busy} disabled={!reason} onClick={submit}>Send request</Button>
      </div>
    </Modal>
  );
}

function ReviewDialog({ so, item, onClose, onDone }: { so: SellerOrder; item: OrderItem | null; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!item) return;
    setBusy(true);
    try {
      await api.post(`/products/${item.product_id}/reviews`, { sellerOrderId: so.id, rating, ...(body.trim() ? { body: body.trim() } : {}) });
      toast.success("Thanks for your review");
      setRating(0);
      setBody("");
      onClose();
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.code === "ALREADY_REVIEWED") {
        toast.info("You've already reviewed this item.");
        onClose();
      } else {
        toast.error(e instanceof ApiError ? e.message : "Couldn't save your review");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!item} onClose={onClose} title="Rate this item">
      <p className="mb-3 line-clamp-2 font-semibold">{item?.title}</p>
      <StarInput value={rating} onChange={setRating} />
      <label className="label mt-4 block" htmlFor="review-body">Your review <span className="label-optional">(optional)</span></label>
      <div className="input-wrap mt-1.5 items-stretch">
        <textarea id="review-body" className="input-el min-h-24 resize-y" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Was it as described? How was the meetup?" />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button loading={busy} disabled={rating === 0} onClick={submit}>Submit review</Button>
      </div>
    </Modal>
  );
}

export function BuyerSellerOrder({ so, priceCurrency, paidAt, onChanged }: Props) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const firstProduct = so.items?.[0]?.product_id;

  const messageSeller = async () => {
    if (!firstProduct) return;
    setOpening(true);
    try {
      router.push(`/messages/${await startConversation(firstProduct)}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't open the chat");
      setOpening(false);
    }
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [busy, setBusy] = useState(false);

  const open = so.refundRequests?.find((r) => r.status === "open");
  const past = so.refundRequests?.filter((r) => r.status !== "open") ?? [];
  const canConfirm = so.status === "delivered" && !so.buyer_confirmed_at;
  const canRefund = ["paid", "shipped", "delivered"].includes(so.status) && refundWindowOpen(so) && !open;
  const canReview = so.status === "delivered" || so.status === "completed";
  const pickup = pickupName(so.pickup_point);

  const confirm = async () => {
    setBusy(true);
    try {
      await api.post(`/orders/seller-orders/${so.id}/confirm`);
      toast.success("Thanks for confirming");
      setConfirmOpen(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't confirm receipt");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await api.post(`/orders/refunds/${open.id}/cancel`);
      toast.success("Refund request withdrawn");
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't withdraw the request");
    } finally {
      setBusy(false);
    }
  };

  const note: Record<string, string> = {
    paid: "Waiting for the seller to hand over or ship your item.",
    shipped: "On its way. Confirm once you have it.",
    completed: "Completed. The seller has been paid.",
  };

  return (
    <section className="card grid gap-5 p-5 sm:p-7" aria-label={`Items from ${so.seller_name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[0.82rem] text-ink-faint">Sold by</p>
          <strong className="font-heading text-lg">{so.seller_name}</strong>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {firstProduct && <Button size="sm" variant="clay" loading={opening} onClick={messageSeller} icon={<MessageCircle size={15} aria-hidden />}>Message seller</Button>}
          <SellerOrderBadge status={so.status} />
        </div>
      </div>

      {!["awaiting_payment", "cancelled"].includes(so.status) && <OrderTimeline so={so} paidAt={paidAt} />}

      {/* Status message */}
      {so.status === "refund_requested" && (
        <div className="alert alert-warning" role="status">
          <Undo2 size={18} aria-hidden />
          <span><strong>Refund requested.</strong> The seller&apos;s payout is on hold while we review your request.</span>
        </div>
      )}
      {so.status === "refunded" && (
        <div className="alert alert-info" role="status"><CheckCircle2 size={18} aria-hidden /><span><strong>Refunded.</strong> Your money for this part of the order is on its way back.</span></div>
      )}
      {so.status === "delivered" && (
        <div className="alert alert-info" role="status">
          <PackageCheck size={18} aria-hidden />
          <span>
            {so.buyer_confirmed_at
              ? <>Thanks for confirming. You can request a refund until <strong>{so.release_at ? formatDateTime(so.release_at) : "the window closes"}</strong>.</>
              : <>The seller marked this delivered. Please confirm you received it{so.release_at ? <>, or the seller is paid automatically on <strong>{formatDateTime(so.release_at)}</strong></> : ""}.</>}
          </span>
        </div>
      )}
      {note[so.status] && <p className="m-0 text-[0.92rem] text-ink-soft">{note[so.status]}</p>}

      {/* Items */}
      <ul className="m-0 grid list-none gap-4 p-0">
        {so.items?.map((it) => (
          <li key={it.id} className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
            <Link href={`/products/${it.product_id}`} className="grid size-16 place-items-center overflow-hidden rounded-md bg-surface-inset text-ink-faint sm:size-18" tabIndex={-1} aria-hidden>
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" className="size-full object-cover" />
              ) : (
                <ImageOff size={22} />
              )}
            </Link>
            <div className="min-w-0">
              <Link href={`/products/${it.product_id}`} className="line-clamp-2 font-semibold text-ink no-underline hover:text-brand-700">{it.title}</Link>
              <span className="text-[0.88rem] text-ink-soft">{it.quantity} × {formatMoney(it.unit_price_minor, priceCurrency)}</span>
            </div>
            <div className="col-span-full flex items-center justify-between gap-3 sm:col-auto sm:flex-col sm:items-end">
              <span className="price">{formatMoney(it.unit_price_minor * it.quantity, priceCurrency)}</span>
              {canReview && <Button size="sm" variant="clay" onClick={() => setReviewItem(it)} icon={<Star size={14} aria-hidden />}>Review</Button>}
            </div>
          </li>
        ))}
      </ul>

      {pickup && (
        <p className="m-0 flex items-center gap-2 text-[0.9rem] text-ink-soft"><MapPin size={16} aria-hidden />Pickup point: <strong className="text-ink">{pickup}</strong></p>
      )}

      {past.map((r) => (
        <div key={r.id} className="alert alert-info text-[0.88rem]">
          <AlertCircle size={16} aria-hidden />
          <span>
            Refund request {r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "withdrawn"}
            {r.resolution_note ? <>: {r.resolution_note}</> : "."}
          </span>
        </div>
      ))}

      {/* Actions */}
      {(canConfirm || canRefund || open) && (
        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          {canConfirm && <Button onClick={() => setConfirmOpen(true)} icon={<CheckCircle2 size={18} aria-hidden />}>I received my item</Button>}
          {canRefund && <Button variant="clay" onClick={() => setRefundOpen(true)} icon={<Undo2 size={18} aria-hidden />}>Request a refund</Button>}
          {open && <Button variant="clay" loading={busy} onClick={withdraw}>Withdraw refund request</Button>}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Did you receive your item?"
        text="Confirming starts a short refund window, then the seller is paid. Only confirm once you have the item and are happy with it."
        confirmLabel="Yes, I received it"
        loading={busy}
        onConfirm={confirm}
        onClose={() => setConfirmOpen(false)}
      />
      <RefundDialog so={so} open={refundOpen} onClose={() => setRefundOpen(false)} onDone={onChanged} />
      <ReviewDialog so={so} item={reviewItem} onClose={() => setReviewItem(null)} onDone={onChanged} />
    </section>
  );
}
