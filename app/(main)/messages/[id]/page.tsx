"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronUp, Flag, ImageOff, Loader2, Lock, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { refreshBadges } from "@/components/layout/useBadgeCounts";
import { PersonAvatar } from "@/components/messages/Avatar";
import { useConversations } from "@/components/messages/ConversationsProvider";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { chatTime, dayLabel, type Message } from "@/lib/messages";
import { useApi } from "@/lib/useApi";

const PAGE = 30;
const MAX = 2000;

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { conversations, reload: reloadInbox } = useConversations();
  const conversation = conversations.find((c) => String(c.id) === id);

  const { data, loading, error, reload } = useApi<{ messages: Message[] }>(`/conversations/${id}/messages`, { limit: PAGE }, { pollMs: 4000 });
  const [older, setOlder] = useState<Message[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [pending, setPending] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState<boolean | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const anchor = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const refreshedInbox = useRef(false);

  // Switching chats starts fresh
  useEffect(() => {
    setOlder([]);
    setSent([]);
    setPending([]);
    setHasMore(null);
    setText("");
    stick.current = true;
    refreshedInbox.current = false;
  }, [id]);

  const latest = data?.messages;

  // Opening a thread marks messages read, so refresh the unread badges and inbox once
  useEffect(() => {
    if (latest && !refreshedInbox.current) {
      refreshedInbox.current = true;
      refreshBadges();
      reloadInbox();
    }
  }, [latest, reloadInbox]);

  const messages = useMemo(() => {
    const map = new Map<number, Message>();
    for (const m of [...older, ...(latest ?? []), ...sent]) map.set(m.id, m);
    return [...map.values()].sort((a, b) => a.id - b.id);
  }, [older, latest, sent]);

  const all = useMemo(() => [...messages, ...pending], [messages, pending]);
  const moreAvailable = hasMore ?? (latest ? latest.length >= PAGE : false);

  // Keep the view pinned to the newest message unless the reader scrolled up
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (anchor.current !== null) {
      el.scrollTop += el.scrollHeight - anchor.current;
      anchor.current = null;
    } else if (stick.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [all.length]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const loadEarlier = useCallback(async () => {
    const first = messages[0];
    if (!first || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get<{ messages: Message[] }>(`/conversations/${id}/messages`, { before: first.id, limit: PAGE });
      anchor.current = scroller.current?.scrollHeight ?? null;
      stick.current = false;
      setOlder((cur) => [...res.messages, ...cur]);
      setHasMore(res.messages.length >= PAGE);
    } catch {
      toast.error("Couldn't load earlier messages");
    } finally {
      setLoadingMore(false);
    }
  }, [id, messages, loadingMore]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending || !user) return;
    const temp: Message = { id: -Date.now(), sender_id: user.id, body, read_at: null, created_at: new Date().toISOString() };
    setSending(true);
    setPending((p) => [...p, temp]);
    setText("");
    stick.current = true;
    if (inputRef.current) inputRef.current.style.height = "auto";
    try {
      const res = await api.post<{ message: Message }>(`/conversations/${id}/messages`, { body });
      setSent((s) => [...s, res.message]);
      reloadInbox();
    } catch (e) {
      setText(body);
      toast.error(e instanceof ApiError && e.code === "RATE_LIMITED" ? "You're sending messages too fast. Wait a moment." : e instanceof ApiError ? e.message : "Couldn't send your message");
    } finally {
      setPending((p) => p.filter((m) => m.id !== temp.id));
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  if (!user) return null;

  // Last of my messages the other person has read
  const lastMineId = [...messages].reverse().find((m) => m.sender_id === user.id)?.id;
  const notFound = error instanceof ApiError && (error.status === 404 || error.status === 403);

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Conversation">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <Link href="/messages" className="icon-btn size-10! md:hidden" aria-label="Back to messages"><ArrowLeft size={18} aria-hidden /></Link>
        {conversation ? (
          <>
            <PersonAvatar name={conversation.other_name} src={conversation.other_avatar} />
            <div className="min-w-0 flex-1">
              <strong className="block truncate font-heading">{conversation.other_name}</strong>
              <Link href={`/products/${conversation.product_id}`} className="flex items-center gap-1.5 text-[0.82rem] text-ink-soft no-underline hover:text-brand-700">
                {conversation.product_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={conversation.product_image} alt="" className="size-5 rounded object-cover" />
                ) : (
                  <ImageOff size={14} aria-hidden />
                )}
                <span className="truncate">{conversation.product_title}</span>
              </Link>
            </div>
            <button type="button" className="icon-btn size-10!" onClick={() => setReportOpen(true)} aria-label={`Report ${conversation.other_name}`}><Flag size={16} aria-hidden /></button>
          </>
        ) : (
          <strong className="font-heading">Conversation</strong>
        )}
      </header>
      {conversation && <ReportDialog open={reportOpen} targetType="user" targetId={conversation.other_user_id} subject={conversation.other_name} onClose={() => setReportOpen(false)} />}

      {/* Messages */}
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto bg-page/60 px-4 py-4 sm:px-6" aria-live="polite">
        <p className="mx-auto mb-4 flex max-w-md items-start gap-2 rounded-md bg-brand-50 px-3.5 py-2.5 text-[0.82rem] text-ink-soft">
          <Lock size={15} className="mt-0.5 flex-none" aria-hidden />
          Keep payments on Ahia so your money stays protected by escrow. Never pay a seller directly.
        </p>

        {loading && !data ? (
          <div className="grid gap-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className={cx("skeleton h-12 w-3/5", i === 1 && "ml-auto")} />)}</div>
        ) : notFound ? (
          <div className="grid justify-items-center gap-3 py-16 text-center text-ink-soft"><MessageCircle size={32} aria-hidden /><p className="m-0">This conversation isn&apos;t available.</p><Link href="/messages">Back to messages</Link></div>
        ) : error && !data ? (
          <div className="grid justify-items-center gap-3 py-16 text-center text-ink-soft"><p className="m-0">We couldn&apos;t load this chat.</p><Button size="sm" variant="clay" onClick={reload}>Try again</Button></div>
        ) : (
          <>
            {moreAvailable && (
              <div className="mb-4 text-center">
                <Button size="sm" variant="clay" loading={loadingMore} onClick={loadEarlier} icon={!loadingMore ? <ChevronUp size={15} aria-hidden /> : undefined}>Load earlier messages</Button>
              </div>
            )}
            {all.length === 0 && <p className="py-12 text-center text-ink-soft">No messages yet. Say hello below.</p>}
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {all.map((m, i) => {
                const mine = m.sender_id === user.id;
                const prev = all[i - 1];
                const newDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at);
                const isPending = m.id < 0;
                return (
                  <li key={m.id} className="grid gap-1.5">
                    {newDay && <span className="mx-auto my-2 rounded-full bg-surface-inset px-3 py-1 text-[0.75rem] font-semibold text-ink-soft">{dayLabel(m.created_at)}</span>}
                    <div className={cx("flex flex-col", mine ? "items-end" : "items-start")}>
                      <div
                        className={cx(
                          "max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[0.95rem] sm:max-w-[70%]",
                          mine ? "rounded-br-md bg-linear-to-br from-brand-300 to-brand-500 text-on-primary shadow-[3px_4px_10px_rgb(217_119_87/0.25)]" : "rounded-bl-md bg-surface text-ink shadow-[var(--clay-out-sm)]",
                          isPending && "opacity-60"
                        )}
                      >
                        {m.body}
                      </div>
                      <span className="mt-0.5 px-1 text-[0.72rem] text-ink-faint">
                        {isPending ? "Sending…" : chatTime(m.created_at)}
                        {mine && m.id === lastMineId && m.read_at ? " · Seen" : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Composer */}
      {!notFound && (
        <form className="flex items-end gap-2.5 border-t border-line bg-surface px-3 py-3 sm:px-5" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <label htmlFor="chat-input" className="sr-only">Message</label>
          <div className="input-wrap min-w-0 flex-1 items-end rounded-xl">
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              maxLength={MAX}
              value={text}
              onChange={(e) => { setText(e.target.value); grow(e.target); }}
              onKeyDown={onKey}
              placeholder="Write a message"
              className="input-el max-h-32 min-h-11 resize-none py-3"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-4" disabled={!text.trim() || sending} aria-label="Send message">
            {sending ? <Loader2 className="spin" size={18} aria-hidden /> : <Send size={18} aria-hidden />}
          </Button>
        </form>
      )}
    </section>
  );
}
