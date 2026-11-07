"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { StatusIcon } from "@/components/auth/AuthShell";
import { refreshBadges } from "@/components/layout/useBadgeCounts";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { XamanPanel } from "@/components/xrp/XamanPanel";
import { useCountdown } from "@/components/xrp/useCountdown";
import { usePaymentStatus } from "@/components/xrp/usePaymentStatus";
import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { clearXrpSession, clock, formatRlusd, loadXrpSession, type XrpSession } from "@/lib/xrp";

function Message({ icon, tone, title, text, children }: { icon: React.ReactNode; tone: "brand" | "success" | "danger"; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="card mx-auto my-8 max-w-lg px-6 py-12 text-center sm:px-10">
      <StatusIcon tone={tone}>{icon}</StatusIcon>
      <h1 className="text-2xl">{title}</h1>
      <p className="mb-6 text-ink-soft">{text}</p>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Pay() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<XrpSession | null | undefined>(undefined);
  const [cancelling, setCancelling] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  useEffect(() => setSession(loadXrpSession(id)), [id]);

  const left = useCountdown(session?.localExpiry ?? null);
  const { status, check } = usePaymentStatus(id, !!session);

  // When the countdown ends, keep checking with the server for a short grace period
  // (the payment may be confirming) before telling the buyer it expired.
  const timerDone = !!session && left === 0;
  useEffect(() => {
    if (!timerDone || status !== "pending_payment") return;
    let alive = true;
    check();
    const t = setTimeout(async () => {
      const s = await check();
      if (alive && s !== "paid") setTimeUp(true);
    }, 20_000);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [timerDone, status, check]);

  useEffect(() => {
    if (status === "paid") {
      refreshBadges();
      clearXrpSession(id);
    }
  }, [status, id]);

  const cancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/orders/${id}/cancel`);
      clearXrpSession(id);
      toast.success("Payment cancelled. Your items are back in your cart.");
      router.push("/cart");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't cancel the order");
      setCancelling(false);
    }
  };

  if (session === undefined) return <div className="skeleton mx-auto my-8 h-96 max-w-3xl rounded-lg" />;

  if (status === "paid") {
    return (
      <Message icon={<CheckCircle2 size={40} aria-hidden />} tone="success" title="Payment received" text="Your RLUSD payment is confirmed on the ledger. The seller has been notified and your money is held safely until you confirm the item.">
        <ButtonLink href={`/orders/${id}`} size="lg">View my order</ButtonLink>
        <ButtonLink href="/products" variant="clay">Continue shopping</ButtonLink>
      </Message>
    );
  }

  if (status === "cancelled" || status === "expired" || timeUp) {
    const expired = status !== "cancelled";
    return (
      <Message icon={<XCircle size={40} aria-hidden />} tone="danger" title={expired ? "This payment expired" : "Payment was cancelled"} text={`${expired ? "The price is only locked for 5 minutes. " : ""}You haven't been charged. Your items are still in your cart.`}>
        <ButtonLink href="/cart" size="lg">Back to cart</ButtonLink>
      </Message>
    );
  }

  if (!session) {
    return (
      <Message icon={<AlertTriangle size={38} aria-hidden />} tone="brand" title="We can't show this payment" text="The payment details are only kept in this browser tab. If you already paid, check your order. Otherwise cancel it and start checkout again.">
        <ButtonLink href={`/orders/${id}`} size="lg">Check my order</ButtonLink>
        <Button variant="clay" loading={cancelling} onClick={cancel}>Cancel and start again</Button>
      </Message>
    );
  }

  const urgent = left <= 60;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1">Pay with RLUSD</h1>
      <p className="mb-6 text-ink-soft">Order #{id}. Sign the payment in Xaman and we&apos;ll confirm it on the XRP Ledger.</p>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card grid gap-5 p-6 sm:p-8" aria-label="Sign in Xaman">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[0.85rem] text-ink-faint">Amount to pay</p>
              <p className="price m-0 text-[2rem] leading-tight">{formatRlusd(session.amountRlusd)}</p>
            </div>
            <span className={cx("badge", urgent ? "badge-danger" : "badge-warning")} role="timer" aria-live={urgent ? "assertive" : "off"}>
              <Clock size={13} aria-hidden />{timerDone ? "Checking your payment…" : `Price locked for ${clock(left)}`}
            </span>
          </div>
          <XamanPanel request={session.xaman} action="pay" />
        </section>

        <section className="grid gap-6">
          <div className="card grid gap-4 p-6 sm:p-7" aria-label="How it works">
            <h2 className="m-0 text-xl">How it works</h2>
            <ol className="m-0 grid list-none gap-3.5 p-0">
              {["Scan the code with Xaman, or tap Open in Xaman on your phone.", "Check the amount and sign the payment.", "We confirm it on the ledger. This page updates by itself."].map((t, i) => (
                <li key={t} className="flex items-start gap-3.5 text-[0.93rem]">
                  <span className="grid size-7 flex-none place-items-center rounded-full bg-brand-100 text-[0.8rem] font-bold text-brand-800">{i + 1}</span>{t}
                </li>
              ))}
            </ol>
            <p className="m-0 text-[0.85rem] text-ink-faint">You need enough RLUSD in your wallet, plus a trust line to the RLUSD issuer. Xaman will tell you if either is missing.</p>
            <p className="clay-inset m-0 flex items-center gap-2.5 px-4 py-3 text-[0.9rem] text-ink-soft"><Loader2 className="spin flex-none" size={16} aria-hidden />Waiting for your payment…</p>
          </div>

          <details className="card group p-0">
            <summary className="cursor-pointer list-none px-6 py-4 font-heading font-semibold marker:hidden [&::-webkit-details-marker]:hidden">Paying from another wallet?</summary>
            <div className="grid gap-3 px-6 pb-6 text-[0.9rem]">
              <p className="m-0 flex items-start gap-2 rounded-md bg-brand-50 px-3.5 py-3 text-ink-soft"><AlertTriangle size={16} className="mt-0.5 flex-none text-warning" aria-hidden />Send RLUSD (the issued currency, not XRP) and include the destination tag, or we can&apos;t match your payment to this order. Your wallet needs a trust line to the issuer shown below.</p>
              {[
                ["Amount (RLUSD)", session.amountRlusd],
                ["Issuer", session.issuer],
                ["Address", session.destination],
                ["Destination tag", String(session.destinationTag)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-28 flex-none text-ink-faint">{label}</span>
                  <code className="min-w-0 flex-1 truncate font-mono font-semibold">{value}</code>
                  <CopyButton text={value} label={label.toLowerCase()} />
                </div>
              ))}
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" className="text-danger!" loading={cancelling} onClick={cancel}>Cancel payment</Button>
            <Link href={`/orders/${id}`} className="text-[0.9rem] font-semibold">View order</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <RequireAuth>
      <Pay />
    </RequireAuth>
  );
}
