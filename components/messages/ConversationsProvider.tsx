"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useApi } from "@/lib/useApi";
import type { Conversation } from "@/lib/messages";

interface Value {
  conversations: Conversation[];
  loading: boolean;
  error: boolean;
  reload: () => void;
}

const Ctx = createContext<Value | null>(null);

/** One shared, auto-refreshing inbox for the list and the open thread. */
export function ConversationsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useApi<{ conversations: Conversation[] }>("/conversations", { limit: 50 }, { pollMs: 15000 });
  const value = useMemo(
    () => ({ conversations: data?.conversations ?? [], loading: loading && !data, error: !!error && !data, reload }),
    [data, loading, error, reload]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConversations() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useConversations must be used inside <ConversationsProvider>");
  return v;
}
