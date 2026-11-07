"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ClipboardList } from "lucide-react";
import { RequireAuth } from "@/components/auth/guards";
import { SellerOrderBadge } from "@/components/orders/StatusBadge";
import { SellerGate } from "@/components/sell/SellerGate";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { formatMoney, type PageInfo } from "@/lib/api";
import { cx } from "@/lib/cx";
import type { SellerOrder } from "@/lib/orders";
import { formatDate } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const TABS = [
  { value: "", label: "All" },
  { value: "paid", label: "To ship" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "refund_requested", label: "Refund requested" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
];

function Orders() {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp.get("status") ?? "";
  const waiting = sp.get("awaiting") === "true";
  const page = Number(sp.get("page")) || 1;
  const { data, loading, error, reload } = useApi<{ orders: SellerOrder[]; page: PageInfo }>("/seller/orders", {
    status, page, limit: 12, awaitingConfirmation: waiting ? "true" : undefined,
  });

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    router.replace(next.size ? `/sell/orders?${next}` : "/sell/orders", { scroll: false });
  };

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/sell" className="text-ink-soft">My listings</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">Orders to fulfil</span>
      </nav>
      <h1 className="mb-1">Orders to fulfil</h1>
      <p className="mb-6 text-ink-soft">Paid orders from buyers. Hand over or ship the item, then mark it delivered.</p>

      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={status === t.value} onClick={() => go({ status: t.value })}
            className={cx("rounded-full px-4 py-2 text-[0.9rem] font-bold transition", status === t.value ? "clay-brand" : "bg-surface text-ink-soft shadow-[var(--clay-out-sm)] hover:text-ink")}>
            {t.label}
          </button>
        ))}
      </div>
      <label className="mb-5 inline-flex cursor-pointer items-center gap-2.5 text-[0.92rem] [&>input]:size-4.5 [&>input]:accent-brand-600">
        <input type="checkbox" checked={waiting} onChange={(e) => go({ awaiting: e.target.checked ? "true" : null })} />
        Only orders the buyer hasn&apos;t confirmed
      </label>

      {loading ? (
        <div className="grid gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState icon={<ClipboardList size={32} aria-hidden />} title="We couldn't load your orders" action={<Button onClick={reload}>Try again</Button>} />
      ) : !data?.orders.length ? (
        <EmptyState icon={<ClipboardList size={32} aria-hidden />} title="No orders here" text="When a buyer pays for one of your items, it shows up here." />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-4 p-0">
            {data.orders.map((o) => {
              const first = o.items?.[0];
              const more = (o.items?.length ?? 0) - 1;
              const net = o.seller_net_minor ?? o.settle_gross_minor;
              return (
                <li key={o.id}>
                  <Link href={`/sell/orders/${o.id}`} className="card clay-press grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 p-4 text-ink no-underline sm:grid-cols-[minmax(0,1.4fr)_auto_auto_auto] sm:px-6 sm:py-5">
                    <div className="min-w-0">
                      <strong className="block truncate font-heading">{o.order_number}</strong>
                      <span className="block truncate text-[0.88rem] text-ink-soft">{first ? `${first.title}${more > 0 ? ` and ${more} more` : ""}` : "View items"}</span>
                      <span className="text-[0.8rem] text-ink-faint">{o.buyer_name} · {formatDate(o.created_at)}</span>
                    </div>
                    <SellerOrderBadge status={o.status} />
                    <div className="text-right">
                      <div className="price">{formatMoney(net, o.settle_currency)}</div>
                      <span className="text-[0.78rem] text-ink-faint">You receive</span>
                    </div>
                    <ChevronRight size={18} className="hidden text-ink-faint sm:block" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page.page} pages={data.page.pages} onChange={(n) => go({ page: String(n) })} />
        </>
      )}
    </>
  );
}

export default function SellerOrdersPage() {
  return (
    <RequireAuth>
      <SellerGate>
        <Suspense fallback={null}>
          <Orders />
        </Suspense>
      </SellerGate>
    </RequireAuth>
  );
}
