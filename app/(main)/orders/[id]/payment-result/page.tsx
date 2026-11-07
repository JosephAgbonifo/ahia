"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { RequireAuth } from "@/components/auth/guards";
import { refreshBadges } from "@/components/layout/useBadgeCounts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { StatusIcon } from "@/components/auth/AuthShell";

type PayStatus = "pending_payment" | "paid" | "cancelled" | "expired";
const MAX_TRIES = 100; // about 4 minutes at 2.5s

function Result() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<PayStatus>("pending_payment");
  const [gaveUp, setGaveUp] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== "pending_payment" || gaveUp) return;
    let tries = 0;
    let stop = false;
    const poll = async () => {
      try {
        const d = await api.get<{ status: PayStatus }>(`/orders/${id}/payment`);
        if (stop) return;
        setStatus(d.status);
        if (d.status === "paid") refreshBadges();
        if (d.status !== "pending_payment") return;
      } catch {
        /* keep trying: the webhook may still be on its way */
      }
      if (++tries >= MAX_TRIES) return setGaveUp(true);
      if (!stop) timer = setTimeout(poll, 2500);
    };
    let timer = setTimeout(poll, 300);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id, status, gaveUp, attempt]);

  const card = (icon: React.ReactNode, tone: "brand" | "success" | "danger", title: string, text: string, actions: React.ReactNode) => (
    <div className={cx("card")} style={{ maxWidth: "32rem", margin: "3rem auto", padding: "clamp(1.75rem, 5vw, 3rem)", textAlign: "center" }}>
      <StatusIcon tone={tone}>{icon}</StatusIcon>
      <h1 style={{ fontSize: "1.6rem" }}>{title}</h1>
      <p className="text-muted">{text}</p>
      <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>{actions}</div>
    </div>
  );

  if (status === "paid")
    return card(<CheckCircle2 size={40} aria-hidden />, "success", "Payment received", "The seller has been notified. Your money is held safely until you confirm the item.", <>
      <ButtonLink href={`/orders/${id}`} size="lg">View my order</ButtonLink>
      <ButtonLink href="/products" variant="clay">Continue shopping</ButtonLink>
    </>);

  if (status === "cancelled" || status === "expired")
    return card(<XCircle size={40} aria-hidden />, "danger", status === "expired" ? "This payment expired" : "Payment was cancelled", "You haven't been charged. Your items are still in your cart.", <ButtonLink href="/cart" size="lg">Back to cart</ButtonLink>);

  if (gaveUp)
    return card(<Clock size={40} aria-hidden />, "brand", "Still waiting for your bank", "If you were charged, your order will update on its own shortly. You can also check again.", <>
      <Button size="lg" onClick={() => { setGaveUp(false); setAttempt((a) => a + 1); }}>Check again</Button>
      <ButtonLink href={`/orders/${id}`} variant="clay">View my order</ButtonLink>
    </>);

  return card(<Loader2 className="spin" size={36} aria-hidden />, "brand", "Confirming your payment", "This only takes a moment. Please don't close this page.", null);
}

export default function PaymentResultPage() {
  return (
    <RequireAuth>
      <Result />
    </RequireAuth>
  );
}
