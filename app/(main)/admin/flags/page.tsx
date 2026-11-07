"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import type { Flag } from "@/lib/admin";
import { formatDateTime } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const LIMIT = 20;
const REASON: Record<string, string> = { no_receipt_confirmation: "Didn't confirm receipt in time" };

function Flags() {
  const router = useRouter();
  const sp = useSearchParams();
  const all = sp.get("all") === "true";
  const page = Number(sp.get("page")) || 1;
  const { data, loading, error, reload } = useApi<{ flags: Flag[] }>("/admin/flags", { all: all ? "true" : undefined, page, limit: LIMIT });
  const [busyId, setBusyId] = useState<number | null>(null);

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    router.replace(next.size ? `/admin/flags?${next}` : "/admin/flags", { scroll: false });
  };

  const resolve = async (f: Flag) => {
    setBusyId(f.id);
    try {
      await api.post(`/admin/flags/${f.id}/resolve`);
      toast.success("Flag resolved");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't resolve the flag");
    } finally {
      setBusyId(null);
    }
  };

  const list = data?.flags ?? [];
  const pages = list.length >= LIMIT ? page + 1 : page;

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">Flagged buyers</span>
      </nav>
      <h1 className="mb-1">Flagged buyers</h1>
      <p className="mb-5 max-w-2xl text-ink-soft">Buyers who didn&apos;t confirm receipt in time, so the seller was paid automatically. Review them and resolve the flag when you&apos;re done.</p>

      <label className="mb-5 inline-flex cursor-pointer items-center gap-2.5 text-[0.92rem] [&>input]:size-4.5 [&>input]:accent-brand-600">
        <input type="checkbox" checked={all} onChange={(e) => go({ all: e.target.checked ? "true" : null })} />
        Include resolved flags
      </label>

      {loading && !data ? (
        <div className="grid gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-lg" />)}</div>
      ) : error && !data ? (
        <EmptyState icon={<Users size={32} aria-hidden />} title="We couldn't load flags" action={<Button onClick={reload}>Try again</Button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Users size={32} aria-hidden />} title="No flagged buyers" text="Nothing needs your attention here." />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-4 p-0">
            {list.map((f) => (
              <li key={f.id} className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
                <div className="min-w-0">
                  <strong className="font-heading text-lg">{f.display_name}</strong>
                  <p className="m-0 text-[0.88rem] text-ink-soft">{f.email}</p>
                  <p className="mt-1.5 mb-0 text-[0.92rem]">{REASON[f.reason] ?? f.reason.replaceAll("_", " ")}{f.note ? <span className="text-ink-soft">. {f.note}</span> : null}</p>
                  <p className="m-0 text-[0.78rem] text-ink-faint">{formatDateTime(f.created_at)}{f.seller_order_id ? ` · Seller order #${f.seller_order_id}` : ""}</p>
                </div>
                {f.resolved_at ? <span className="badge badge-success">Resolved {formatDateTime(f.resolved_at)}</span> : <Button size="sm" loading={busyId === f.id} onClick={() => resolve(f)} icon={<CheckCircle2 size={15} aria-hidden />}>Resolve</Button>}
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={pages} onChange={(n) => go({ page: String(n) })} />
        </>
      )}
    </>
  );
}

export default function AdminFlagsPage() {
  return (
    <RequireAuth role="admin">
      <Suspense fallback={null}>
        <Flags />
      </Suspense>
    </RequireAuth>
  );
}
