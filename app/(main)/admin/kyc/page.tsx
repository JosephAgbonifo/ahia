"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { formatDate } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

interface Submission {
  id: number;
  user_id: number;
  id_type: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  display_name: string;
  email: string;
}

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const LIMIT = 20;
const ID_LABEL: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  drivers_license: "Driver's licence",
  student_id: "Student ID",
  voters_card: "Voter's card",
};
const TONE = { pending: "badge-warning", approved: "badge-success", rejected: "badge-danger" } as const;

function Queue() {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "pending";
  const page = Number(sp.get("page")) || 1;
  const { data, loading, error, reload } = useApi<{ submissions: Submission[] }>("/admin/kyc", { status, page, limit: LIMIT });

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    if (!("page" in patch)) next.delete("page");
    router.replace(`/admin/kyc?${next}`, { scroll: false });
  };

  const list = data?.submissions ?? [];
  // The API returns a plain list, so assume there's another page when this one is full
  const knownPages = list.length >= LIMIT ? page + 1 : page;

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link>
        <ChevronRight size={14} aria-hidden />
        <span aria-current="page">ID verifications</span>
      </nav>
      <h1 className="mb-1">ID verifications</h1>
      <p className="mb-6 text-ink-soft">Oldest submissions first. Open one to review the documents.</p>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={status === t.value} onClick={() => go({ status: t.value })}
            className={cx("rounded-full px-4 py-2 text-[0.9rem] font-bold transition", status === t.value ? "clay-brand" : "bg-surface text-ink-soft shadow-[var(--clay-out-sm)] hover:text-ink")}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState icon={<ShieldCheck size={32} aria-hidden />} title="We couldn't load the queue" action={<Button onClick={reload}>Try again</Button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={32} aria-hidden />} title={status === "pending" ? "All caught up" : "Nothing here"} text={status === "pending" ? "There are no ID verifications waiting for review." : "No submissions with this status."} />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-3 p-0">
            {list.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/kyc/${s.id}`} className="card clay-press grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-ink no-underline sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] sm:px-6">
                  <div className="min-w-0">
                    <strong className="block truncate font-heading">{s.display_name}</strong>
                    <span className="block truncate text-[0.88rem] text-ink-soft">{s.email}</span>
                  </div>
                  <span className="hidden text-[0.9rem] text-ink-soft sm:block">{ID_LABEL[s.id_type] ?? s.id_type}<br /><span className="text-ink-faint">Submitted {formatDate(s.submitted_at)}</span></span>
                  <span className={cx("badge", TONE[s.status])}>{s.status[0].toUpperCase() + s.status.slice(1)}</span>
                  <ChevronRight size={18} className="hidden text-ink-faint sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={knownPages} onChange={(n) => go({ page: String(n) })} />
        </>
      )}
    </>
  );
}

export default function AdminKycPage() {
  return (
    <RequireAuth role="admin">
      <Suspense fallback={null}>
        <Queue />
      </Suspense>
    </RequireAuth>
  );
}
