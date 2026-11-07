"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronRight, ExternalLink, Flag, ShieldAlert, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { api, ApiError } from "@/lib/api";
import type { Report } from "@/lib/admin";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const TABS = [
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
  { value: "dismissed", label: "Dismissed" },
];
const TONE = { open: "badge-warning", reviewed: "badge-success", dismissed: "" } as const;
const LIMIT = 20;
type Action = { r: Report; kind: "removeProduct" | "suspendUser" };

function Queue() {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "open";
  const page = Number(sp.get("page")) || 1;
  const { data, loading, error, reload } = useApi<{ reports: Report[] }>("/admin/reports", { status, page, limit: LIMIT });
  const [action, setAction] = useState<Action | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    if (!("page" in patch)) next.delete("page");
    router.replace(`/admin/reports?${next}`, { scroll: false });
  };

  const setStatus = async (r: Report, next: "reviewed" | "dismissed") => {
    setBusyId(r.id);
    try {
      await api.patch(`/admin/reports/${r.id}`, { status: next });
      toast.success(next === "reviewed" ? "Marked as reviewed" : "Report dismissed");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the report");
    } finally {
      setBusyId(null);
    }
  };

  const runAction = async () => {
    if (!action) return;
    setBusyId(action.r.id);
    try {
      if (action.kind === "removeProduct") await api.patch(`/admin/products/${action.r.target_id}`, { status: "removed" });
      else await api.patch(`/admin/users/${action.r.target_id}/status`, { status: "suspended" });
      await api.patch(`/admin/reports/${action.r.id}`, { status: "reviewed" });
      toast.success(action.kind === "removeProduct" ? "Listing removed and report closed" : "User suspended and report closed");
      setAction(null);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't complete that action");
    } finally {
      setBusyId(null);
    }
  };

  const list = data?.reports ?? [];
  const pages = list.length >= LIMIT ? page + 1 : page;

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">Reports</span>
      </nav>
      <h1 className="mb-1">User reports</h1>
      <p className="mb-6 text-ink-soft">Listings and people flagged by other users.</p>
      <div className="mb-5"><Tabs label="Filter by status" tabs={TABS} value={status} onChange={(v) => go({ status: v })} /></div>

      {loading && !data ? (
        <div className="grid gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32 rounded-lg" />)}</div>
      ) : error && !data ? (
        <EmptyState icon={<Flag size={32} aria-hidden />} title="We couldn't load reports" action={<Button onClick={reload}>Try again</Button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Flag size={32} aria-hidden />} title={status === "open" ? "No open reports" : "Nothing here"} />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-4 p-0">
            {list.map((r) => (
              <li key={r.id} className="card grid gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong className="font-heading text-lg">{r.reason}</strong>
                    <p className="m-0 text-[0.88rem] text-ink-soft">Reported {r.target_type} #{r.target_id} by {r.reporter_name}</p>
                    <p className="m-0 text-[0.8rem] text-ink-faint">{formatDateTime(r.created_at)} · Report #{r.id}</p>
                  </div>
                  <span className={cx("badge", TONE[r.status])}>{r.status[0].toUpperCase() + r.status.slice(1)}</span>
                </div>

                {r.details && <p className="clay-inset m-0 p-4 text-[0.92rem] text-ink-soft">&ldquo;{r.details}&rdquo;</p>}

                <div className="flex flex-wrap gap-2.5">
                  {r.target_type === "product" && <Link href={`/products/${r.target_id}`} target="_blank" className="btn btn-clay btn-sm"><ExternalLink size={14} aria-hidden />View listing</Link>}
                  {r.status === "open" && (
                    <>
                      {r.target_type === "product" && <Button size="sm" variant="danger" onClick={() => setAction({ r, kind: "removeProduct" })} icon={<Trash2 size={14} aria-hidden />}>Remove listing</Button>}
                      {r.target_type === "user" && <Button size="sm" variant="danger" onClick={() => setAction({ r, kind: "suspendUser" })} icon={<ShieldAlert size={14} aria-hidden />}>Suspend user</Button>}
                      <Button size="sm" loading={busyId === r.id} onClick={() => setStatus(r, "reviewed")} icon={<CheckCircle2 size={14} aria-hidden />}>Mark reviewed</Button>
                      <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => setStatus(r, "dismissed")} icon={<XCircle size={14} aria-hidden />}>Dismiss</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={pages} onChange={(n) => go({ page: String(n) })} />
        </>
      )}

      <ConfirmDialog
        open={!!action}
        title={action?.kind === "removeProduct" ? "Remove the reported listing?" : "Suspend the reported user?"}
        text={action?.kind === "removeProduct" ? "The listing disappears from the store and this report is marked reviewed." : "They'll be logged out everywhere and unable to log in. This report is marked reviewed."}
        confirmLabel={action?.kind === "removeProduct" ? "Remove listing" : "Suspend user"}
        danger
        loading={busyId === action?.r.id}
        onConfirm={runAction}
        onClose={() => setAction(null)}
      />
    </>
  );
}

export default function AdminReportsPage() {
  return (
    <RequireAuth role="admin">
      <Suspense fallback={null}>
        <Queue />
      </Suspense>
    </RequireAuth>
  );
}
