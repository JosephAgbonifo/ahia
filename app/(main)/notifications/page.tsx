"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellOff, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { refreshBadges } from "@/components/layout/useBadgeCounts";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { iconFor, notificationTarget, type AppNotification } from "@/lib/notifications";
import { formatDateTime } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const LIMIT = 20;

function Notifications() {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const { data, loading, error, reload } = useApi<{ notifications: AppNotification[]; unread: number }>(
    "/notifications",
    { unread: tab === "unread" ? "true" : undefined, page: 1, limit: LIMIT },
    { pollMs: 60000 }
  );

  const [extra, setExtra] = useState<AppNotification[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [more, setMore] = useState<boolean | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [allRead, setAllRead] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    setExtra([]);
    setNextPage(2);
    setMore(null);
    setAllRead(false);
  }, [tab]);

  const first = data?.notifications;
  const items = useMemo(() => {
    const map = new Map<number, AppNotification>();
    for (const n of [...(first ?? []), ...extra]) map.set(n.id, n);
    return [...map.values()];
  }, [first, extra]);

  const isRead = (n: AppNotification) => allRead || !!n.read_at || readIds.has(n.id);
  const unreadCount = allRead ? 0 : Math.max((data?.unread ?? 0) - readIds.size, 0);
  const hasMore = more ?? (first ? first.length >= LIMIT : false);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await api.get<{ notifications: AppNotification[] }>("/notifications", { unread: tab === "unread" ? "true" : undefined, page: nextPage, limit: LIMIT });
      setExtra((cur) => [...cur, ...res.notifications]);
      setNextPage((p) => p + 1);
      setMore(res.notifications.length >= LIMIT);
    } catch {
      toast.error("Couldn't load more notifications");
    } finally {
      setLoadingMore(false);
    }
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await api.post("/notifications/read", {});
      setAllRead(true);
      refreshBadges();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't mark them as read");
    } finally {
      setMarking(false);
    }
  };

  const open = async (n: AppNotification) => {
    if (!isRead(n)) {
      setReadIds((s) => new Set(s).add(n.id));
      api.post("/notifications/read", { ids: [n.id] }).then(refreshBadges).catch(() => undefined);
    }
    const target = notificationTarget(n);
    if (!target) return;
    if ("href" in target) return router.push(target.href);
    try {
      const r = await api.get<{ sellerOrder: { order_id: number } }>(`/orders/seller-orders/${target.sellerOrderId}`);
      router.push(`/orders/${r.sellerOrder.order_id}`);
    } catch {
      router.push("/orders");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1">Notifications</h1>
          <p className="m-0 text-ink-soft">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
        </div>
        <Button variant="clay" size="sm" loading={marking} disabled={unreadCount === 0} onClick={markAll} icon={<CheckCheck size={16} aria-hidden />}>Mark all as read</Button>
      </div>

      <div className="mb-5">
        <Tabs label="Filter notifications" tabs={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }]} value={tab} onChange={(v) => setTab(v as "all" | "unread")} />
      </div>

      {loading && !data ? (
        <div className="grid gap-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-lg" />)}</div>
      ) : error && !data ? (
        <EmptyState icon={<BellOff size={32} aria-hidden />} title="We couldn't load your notifications" action={<Button onClick={reload}>Try again</Button>} />
      ) : items.length === 0 ? (
        <EmptyState icon={<BellOff size={32} aria-hidden />} title={tab === "unread" ? "No unread notifications" : "No notifications yet"} text="Updates about your orders, payouts and verification show up here." />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-3 p-0">
            {items.map((n) => {
              const Icon = iconFor(n.type);
              const read = isRead(n);
              const clickable = !!notificationTarget(n);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => open(n)}
                    className={cx("card grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 p-4 text-left sm:px-5", clickable && "clay-press", !read && "border-brand-300 bg-brand-50/60")}
                  >
                    <span className={cx("grid size-11 place-items-center rounded-full", read ? "bg-surface-inset text-ink-soft" : "bg-brand-100 text-brand-700")}><Icon size={20} aria-hidden /></span>
                    <span className="min-w-0">
                      <strong className={cx("block font-heading text-[0.95rem]", !read && "text-ink")}>{n.title}</strong>
                      {n.body && <span className="block text-[0.9rem] text-ink-soft">{n.body}</span>}
                      <span className="mt-1 block text-[0.78rem] text-ink-faint">{formatDateTime(n.created_at)}</span>
                    </span>
                    {!read && <span className="mt-2 size-2.5 rounded-full bg-brand-500" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {hasMore && <div className="mt-6 text-center"><Button variant="clay" loading={loadingMore} onClick={loadMore}>Load more</Button></div>}
        </>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <Notifications />
    </RequireAuth>
  );
}
