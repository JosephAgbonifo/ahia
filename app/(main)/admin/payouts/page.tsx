"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Banknote, CheckCircle2, ChevronRight, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Tabs } from "@/components/ui/Tabs";
import { TextPromptModal } from "@/components/ui/TextPromptModal";
import { api, ApiError, formatMoney, type Currency } from "@/lib/api";
import { cx } from "@/lib/cx";
import { PAYOUT_STATUS, type PayoutStatus } from "@/lib/payouts";
import { formatDateTime } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

interface AdminPayout {
  id: number;
  user_id: number;
  currency: Currency;
  amount_minor: number;
  status: PayoutStatus;
  requested_at: string;
  display_name: string;
  email: string;
  account_type: "bank" | "xrp";
  bank_name: string | null;
  bank_code: string | null;
  account_name: string | null;
  xrp_address: string | null;
  xrp_dest_tag: number | null;
  accountNumber: string | null;
}

const TABS = [
  { value: "requested", label: "Requested" },
  { value: "processing", label: "Processing" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
];
const LIMIT = 20;

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-24 flex-none text-ink-faint">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 truncate font-semibold">{value}</dd>
      {copy && <CopyButton text={value} label={label.toLowerCase()} />}
    </div>
  );
}

function Queue() {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "requested";
  const page = Number(sp.get("page")) || 1;
  const { data, loading, error, reload } = useApi<{ payouts: AdminPayout[] }>("/admin/payouts", { status, page, limit: LIMIT });

  const [target, setTarget] = useState<{ p: AdminPayout; kind: "paid" | "fail" } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    if (!("page" in patch)) next.delete("page");
    router.replace(`/admin/payouts?${next}`, { scroll: false });
  };

  const call = async (p: AdminPayout, path: string, body: unknown, success: string) => {
    setBusyId(p.id);
    try {
      await api.post(`/admin/payouts/${p.id}/${path}`, body);
      toast.success(success);
      setTarget(null);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  const list = data?.payouts ?? [];
  const pages = list.length >= LIMIT ? page + 1 : page;

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">Payouts</span>
      </nav>
      <h1 className="mb-1">Seller payouts</h1>
      <p className="mb-6 text-ink-soft">Send the money yourself, then mark the payout paid. Failed payouts return to the seller&apos;s balance.</p>
      <div className="mb-5"><Tabs label="Filter by status" tabs={TABS} value={status} onChange={(v) => go({ status: v })} /></div>

      {loading && !data ? (
        <div className="grid gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState icon={<Banknote size={32} aria-hidden />} title="We couldn't load payouts" action={<Button onClick={reload}>Try again</Button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Banknote size={32} aria-hidden />} title={status === "requested" ? "No payouts waiting" : "Nothing here"} text="Seller withdrawals show up here." />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-4 p-0">
            {list.map((p) => {
              const st = PAYOUT_STATUS[p.status];
              const open = p.status === "requested" || p.status === "processing";
              return (
                <li key={p.id} className="card grid gap-4 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="price text-2xl">{formatMoney(p.amount_minor, p.currency)}</span>
                      <p className="m-0 text-[0.88rem] text-ink-soft">{p.display_name} · {p.email}</p>
                      <p className="m-0 text-[0.8rem] text-ink-faint">Requested {formatDateTime(p.requested_at)} · Payout #{p.id}</p>
                    </div>
                    <span className={cx("badge", st.tone)}>{st.label}</span>
                  </div>

                  <dl className="clay-inset m-0 grid gap-2.5 p-4 text-[0.9rem]">
                    {p.account_type === "bank" ? (
                      <>
                        <Row label="Bank" value={`${p.bank_name ?? ""}${p.bank_code ? ` (${p.bank_code})` : ""}`} />
                        <Row label="Account no." value={p.accountNumber ?? "Unavailable"} copy={!!p.accountNumber} />
                        <Row label="Account name" value={p.account_name ?? ""} copy />
                      </>
                    ) : (
                      <>
                        <Row label="XRPL address" value={p.xrp_address ?? ""} copy />
                        {p.xrp_dest_tag !== null && <Row label="Dest. tag" value={String(p.xrp_dest_tag)} copy />}
                      </>
                    )}
                  </dl>

                  {open && (
                    <div className="flex flex-wrap gap-3">
                      {p.status === "requested" && <Button variant="clay" loading={busyId === p.id} onClick={() => call(p, "processing", undefined, "Marked as processing")} icon={<Loader2 size={16} aria-hidden />}>Mark processing</Button>}
                      <Button onClick={() => setTarget({ p, kind: "paid" })} icon={<CheckCircle2 size={16} aria-hidden />}>Mark paid</Button>
                      <Button variant="ghost" className="text-danger!" onClick={() => setTarget({ p, kind: "fail" })} icon={<XCircle size={16} aria-hidden />}>Mark failed</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={page} pages={pages} onChange={(n) => go({ page: String(n) })} />
        </>
      )}

      <TextPromptModal
        open={target?.kind === "paid"}
        title="Mark this payout as paid?"
        description={target ? `The seller (${target.p.display_name}) will be notified that ${formatMoney(target.p.amount_minor, target.p.currency)} was sent.` : undefined}
        label={target?.p.account_type === "xrp" ? "XRPL transaction hash" : "Bank or provider reference"}
        placeholder={target?.p.account_type === "xrp" ? "e.g. F00DBABE…" : "e.g. transfer reference"}
        confirmLabel="Mark paid"
        max={200}
        loading={busyId === target?.p.id}
        onConfirm={(v) => target && call(target.p, "paid", v ? (target.p.account_type === "xrp" ? { xrpTxHash: v } : { providerRef: v }) : {}, "Marked as paid. The seller has been notified.")}
        onClose={() => setTarget(null)}
      />
      <TextPromptModal
        open={target?.kind === "fail"}
        title="Mark this payout as failed?"
        description="The money returns to the seller's available balance. They'll see your reason."
        label="Reason"
        placeholder="e.g. Account name doesn't match your verified ID"
        confirmLabel="Mark failed"
        danger
        multiline
        min={3}
        max={300}
        loading={busyId === target?.p.id}
        onConfirm={(v) => target && call(target.p, "fail", { reason: v }, "Marked as failed. The funds are back in the seller's balance.")}
        onClose={() => setTarget(null)}
      />
    </>
  );
}

export default function AdminPayoutsPage() {
  return (
    <RequireAuth role="admin">
      <Suspense fallback={null}>
        <Queue />
      </Suspense>
    </RequireAuth>
  );
}
