"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Package } from "lucide-react";
import { RequireAuth } from "@/components/auth/guards";
import { OrderBadge } from "@/components/orders/StatusBadge";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatMoney, type PageInfo } from "@/lib/api";
import type { OrderSummary } from "@/lib/orders";
import { isLedgerPayment } from "@/lib/xrp";
import { formatDate } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

function Orders() {
  const router = useRouter();
  const sp = useSearchParams();
  const page = Number(sp.get("page")) || 1;
  const { data, loading, error, reload } = useApi<{ orders: OrderSummary[]; page: PageInfo }>("/orders", { page, limit: 10 });

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-1">My orders</h1>
        <p className="m-0 text-ink-soft">Track what you&apos;ve bought and confirm when it arrives.</p>
      </div>

      {loading ? (
        <div className="grid gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-lg" />)}</div>
      ) : error ? (
        <EmptyState icon={<Package size={32} aria-hidden />} title="We couldn't load your orders" action={<Button onClick={reload}>Try again</Button>} />
      ) : !data?.orders.length ? (
        <EmptyState icon={<Package size={32} aria-hidden />} title="No orders yet" text="When you buy something, it shows up here." action={<ButtonLink href="/products">Start shopping</ButtonLink>} />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-4 p-0">
            {data.orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="card clay-press grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 p-4 text-ink no-underline sm:grid-cols-[minmax(0,1.3fr)_auto_auto_auto] sm:px-6 sm:py-5">
                  <div className="min-w-0">
                    <strong className="block truncate font-heading">{o.order_number}</strong>
                    <span className="text-[0.85rem] text-ink-soft">{formatDate(o.created_at)} · {o.seller_count} seller{o.seller_count === 1 ? "" : "s"}</span>
                  </div>
                  <OrderBadge status={o.status} />
                  <div className="col-span-1 text-right">
                    <div className="price">{formatMoney(o.total_paid_minor, o.payment_currency)}</div>
                    <span className="text-[0.78rem] text-ink-faint">{isLedgerPayment(o.payment_method) ? "Paid in RLUSD" : "Paid by card or bank"}</span>
                  </div>
                  <ChevronRight size={18} className="hidden text-ink-faint sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={data.page.page} pages={data.page.pages} onChange={(n) => router.replace(`/orders?page=${n}`, { scroll: false })} />
        </>
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <Orders />
      </Suspense>
    </RequireAuth>
  );
}
