"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import { listTime } from "@/lib/messages";
import { PersonAvatar } from "./Avatar";
import { useConversations } from "./ConversationsProvider";

export function ConversationList({ activeId }: { activeId: number | null }) {
  const { conversations, loading, error, reload } = useConversations();

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Conversations">
      <h1 className="m-0 border-b border-line px-5 py-4 text-xl">Messages</h1>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid gap-2 p-4" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20" />)}</div>
        ) : error ? (
          <div className="grid justify-items-center gap-3 p-8 text-center text-ink-soft">
            <p className="m-0">We couldn&apos;t load your messages.</p>
            <Button size="sm" variant="clay" onClick={reload}>Try again</Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-brand-50 text-brand-600"><MessageCircle size={28} aria-hidden /></span>
            <strong className="font-heading">No conversations yet</strong>
            <p className="m-0 text-[0.9rem] text-ink-soft">Use &ldquo;Ask the seller&rdquo; on any product to start one.</p>
          </div>
        ) : (
          <ul className="m-0 list-none p-2">
            {conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <Link
                    href={`/messages/${c.id}`}
                    aria-current={active ? "page" : undefined}
                    className={cx("grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg p-3 text-ink no-underline hover:bg-brand-50", active && "bg-brand-50 shadow-[var(--clay-pressed)]")}
                  >
                    <PersonAvatar name={c.other_name} src={c.other_avatar} />
                    <div className="min-w-0">
                      <strong className={cx("block truncate font-heading text-[0.95rem]", c.unread > 0 && "text-ink")}>{c.other_name}</strong>
                      <span className="block truncate text-[0.78rem] text-ink-faint">{c.product_title}</span>
                      <span className={cx("block truncate text-[0.88rem]", c.unread > 0 ? "font-semibold text-ink" : "text-ink-soft")}>{c.last_message ?? "No messages yet"}</span>
                    </div>
                    <div className="grid justify-items-end gap-1.5">
                      <span className="text-[0.75rem] text-ink-faint">{listTime(c.last_message_at)}</span>
                      {c.unread > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.7rem] font-extrabold text-white" aria-label={`${c.unread} unread`}>{c.unread > 99 ? "99+" : c.unread}</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
