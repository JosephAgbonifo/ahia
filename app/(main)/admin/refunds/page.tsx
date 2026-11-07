"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronRight, Send, Undo2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { TextPromptModal } from "@/components/ui/TextPromptModal";
import { api, ApiError, formatMoney, type Currency } from "@/lib/api";
import { cx } from "@/lib/cx";
import { REFUND_REASONS } from "@/lib/orders";
import { formatDateTime } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

interface AdminRefund {
  id: number;
  seller_order_id: number;
  reason: string;
  details: string | null;
  status: "open" | "approved" | "rejected" | "cancelled";
  created_at: string;
  settle_currency: Currency;
  settle_gross_minor: number;
  order_id: number;
  buyer_name: string;
  seller_name: string;
}

const TABS = [
  { value: "open", label: "Open" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Withdrawn" },
];
const TONE = { open: "badge-warning", approved: "badge-success", rejected: "badge-danger", cancelled: "" } as const;
const LIMIT = 20;
type Kind = "approve" | "reject" | "sent";

function Queue() {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "open";
  const page = Number(sp.get("page")) || 1;
  const { data, loading, error, reload } = useApi<{ refunds: AdminRefund[] }>("/admin/refunds", { status, page, limit: LIMIT });
  const [target, setTarget] = useState<{ r: AdminRefund; kind: Kind } | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    if (!("page" in patch)) next.delete("page");
    router.replace(`/admin/refunds?${next}`, { scroll: false });
  };

  const run = async (value: string) => {
    if (!target) return;
    const { r, kind } = target;
    setBusy(true);
    try {
      if (kind === "approve") {
        const res = await api.post<{ autoRefunded: boolean }>(`/admin/refunds/${r.id}/approve`, value ? { note: value } : {});
        toast.success(res.autoRefunded ? "Approved. The buyer was refunded automatically." : "Approved. Send the RLUSD refund yourself, then mark it as sent.");
      } else if (kind === "reject") {
        await api.post(`/admin/refunds/${r.id}/reject`, value ? { note: value } : {});
        toast.success("Refund rejected. The buyer can see your note.");
      } else {
        await api.post(`/admin/refunds/${r.id}/mark-paid`, value ? { txHash: value } : {});
        toast.success("Marked as sent");
      }
      setTarget(null);
      reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === "ALREADY_RESOLVED") {
        toast.info("This request was already resolved.");
        setTarget(null);
        reload();
      } else {
        toast.error(e instanceof ApiError ? e.message : "Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  };

  const list = data?.refunds ?? [];
  const pages = list.length >= LIMIT ? page + 1 : page;
  const reasonLabel = (v: string) => REFUND_REASONS.find((x) => x.value === v)?.label ?? v.replaceAll("_", " ");

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">Refunds</span>
      </nav>
      <h1 className="mb-1">Refund requests</h1>
      <p className="mb-6 text-ink-soft">Naira refunds go back through Paystack automatically. RLUSD refunds you send yourself.</p>
      <div className="mb-5"><Tabs label="Filter by status" tabs={TABS} value={status} onChange={(v) => go({ status: v })} /></div>

      {loading && !data ? (
        <div className="grid gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-36 rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState icon={<Undo2 size={32} aria-hidden />} title="We couldn't load refund requests" action={<Button onClick={reload}>Try again</Button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Undo2 size={32} aria-hidden />} title={status === "open" ? "No open refund requests" : "Nothing here"} />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-4 p-0">
            {list.map((r) => (
              <li key={r.id} className="card grid gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="price text-2xl">{formatMoney(r.settle_gross_minor, r.settle_currency)}</span>
                    <p className="m-0 text-[0.88rem] text-ink-soft">{r.buyer_name} asked for a refund from {r.seller_name}</p>
                    <p className="m-0 text-[0.8rem] text-ink-faint">Order #{r.order_id} · Requested {formatDateTime(r.created_at)}</p>
                  </div>
                  <span className={cx("badge", TONE[r.status])}>{r.status === "cancelled" ? "Withdrawn" : r.status[0].toUpperCase() + r.status.slice(1)}</span>
                </div>

                <div className="clay-inset grid gap-1 p-4 text-[0.92rem]">
                  <span><strong>Reason:</strong> {reasonLabel(r.reason)}</span>
                  {r.details && <span className="text-ink-soft">&ldquo;{r.details}&rdquo;</span>}
                </div>

                <div className="flex flex-wrap gap-3">
                  {r.status === "open" && (
                    <>
                      <Button onClick={() => setTarget({ r, kind: "approve" })} icon={<CheckCircle2 size={16} aria-hidden />}>Approve</Button>
                      <Button variant="clay" onClick={() => setTarget({ r, kind: "reject" })} icon={<XCircle size={16} aria-hidden />}>Reject</Button>
                    </>
                  )}
                  {r.status === "approved" && (r.settle_currency === "RLUSD" || r.settle_currency === "XRP") && (
                    <Button variant="clay" onClick={() => setTarget({ r, kind: "sent" })} icon={<Send size={16} aria-hidden />}>Mark RLUSD refund as sent</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={pages} onChange={(n) => go({ page: String(n) })} />
        </>
      )}

      <TextPromptModal
        open={target?.kind === "approve"}
        title="Approve this refund?"
        description="The seller's held money and the platform fee are reversed, and the buyer is owed what they paid for this part of the order."
        label="Note"
        placeholder="Optional note for the record"
        confirmLabel="Approve refund"
        multiline
        max={500}
        loading={busy}
        onConfirm={run}
        onClose={() => setTarget(null)}
      />
      <TextPromptModal
        open={target?.kind === "reject"}
        title="Reject this refund?"
        description="The order returns to its previous status. The buyer will see your note."
        label="Note to the buyer"
        placeholder="e.g. The item matched its description."
        confirmLabel="Reject refund"
        danger
        multiline
        max={500}
        loading={busy}
        onConfirm={run}
        onClose={() => setTarget(null)}
      />
      <TextPromptModal
        open={target?.kind === "sent"}
        title="Mark the RLUSD refund as sent?"
        label="XRPL transaction hash"
        placeholder="Saved in the audit log"
        confirmLabel="Mark as sent"
        max={100}
        loading={busy}
        onConfirm={run}
        onClose={() => setTarget(null)}
      />
    </>
  );
}

export default function AdminRefundsPage() {
  return (
    <RequireAuth role="admin">
      <Suspense fallback={null}>
        <Queue />
      </Suspense>
    </RequireAuth>
  );
}
