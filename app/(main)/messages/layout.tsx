"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RequireAuth } from "@/components/auth/guards";
import { ConversationList } from "@/components/messages/ConversationList";
import { ConversationsProvider } from "@/components/messages/ConversationsProvider";
import { cx } from "@/lib/cx";

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const match = pathname.match(/^\/messages\/(\d+)/);
  const activeId = match ? Number(match[1]) : null;
  const inThread = activeId !== null;

  // Phones show either the list or the open chat. Wider screens show both.
  return (
    <div className="card grid h-[calc(100dvh-13rem)] min-h-112 overflow-hidden md:grid-cols-[22rem_minmax(0,1fr)]">
      <div className={cx("min-h-0 border-line md:block md:border-r", inThread ? "hidden" : "block")}>
        <ConversationList activeId={activeId} />
      </div>
      <div className={cx("min-h-0 md:block", inThread ? "block" : "hidden")}>{children}</div>
    </div>
  );
}

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <ConversationsProvider>
        <Shell>{children}</Shell>
      </ConversationsProvider>
    </RequireAuth>
  );
}
