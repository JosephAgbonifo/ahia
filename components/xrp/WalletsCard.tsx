"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/shop";
import { useApi } from "@/lib/useApi";
import type { XamanRequest } from "@/lib/xrp";
import { XamanPanel } from "./XamanPanel";

interface WalletRow {
  id: number;
  address: string;
  connected_at: string;
  last_used_at: string | null;
}

type Phase = "waiting" | "failed" | "timeout";
const MAX_TRIES = 120; // about 5 minutes at 2.5s

function ConnectModal({ request, onClose, onConnected }: { request: XamanRequest | null; onClose: () => void; onConnected: () => void }) {
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    if (!request) return;
    setPhase("waiting");
    let stop = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const r = await api.get<{ status: "pending" | "connected" | "failed" }>(`/wallets/xaman/connect/${request.payloadUuid}`);
        if (stop) return;
        if (r.status === "connected") {
          toast.success("Wallet connected");
          onConnected();
          onClose();
          return;
        }
        if (r.status === "failed") return setPhase("failed");
      } catch {
        /* keep trying */
      }
      if (++tries >= MAX_TRIES) return setPhase("timeout");
      timer = setTimeout(poll, 2500);
    };
    timer = setTimeout(poll, 1500);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  return (
    <Modal open={!!request} onClose={onClose} title="Connect your Xaman wallet">
      {request && phase === "waiting" && (
        <div className="grid gap-4">
          <p className="m-0 text-ink-soft">Approve the sign-in request in Xaman. It doesn&apos;t cost anything and doesn&apos;t move any money.</p>
          <XamanPanel request={request} action="sign in" />
          <p className="clay-inset m-0 flex items-center justify-center gap-2.5 px-4 py-3 text-[0.9rem] text-ink-soft"><Loader2 className="spin" size={16} aria-hidden />Waiting for you to approve…</p>
        </div>
      )}
      {phase !== "waiting" && (
        <div className="grid gap-4">
          <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><span>{phase === "failed" ? "The request was declined or didn't work." : "We didn't hear back from Xaman in time."} Close this and try again.</span></div>
          <Button onClick={onClose}>Close</Button>
        </div>
      )}
    </Modal>
  );
}

export function WalletsCard() {
  const { data, loading, error, reload } = useApi<{ wallets: WalletRow[] }>("/wallets");
  const [request, setRequest] = useState<XamanRequest | null>(null);
  const [starting, setStarting] = useState(false);
  const [toRemove, setToRemove] = useState<WalletRow | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      setRequest(await api.post<XamanRequest>("/wallets/xaman/connect"));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't start the connection");
    } finally {
      setStarting(false);
    }
  };

  const remove = async () => {
    if (!toRemove) return;
    setBusy(true);
    try {
      await api.delete(`/wallets/${toRemove.id}`);
      toast.success("Wallet removed");
      setToRemove(null);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't remove the wallet");
    } finally {
      setBusy(false);
    }
  };

  const wallets = data?.wallets ?? [];

  return (
    <section className="card p-5 sm:p-7" aria-labelledby="wallets-h">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="wallets-h" className="mb-1 text-xl">XRPL wallets</h2>
          <p className="m-0 text-[0.9rem] text-ink-soft">Wallets you&apos;ve paid from are saved here automatically. You can also connect one yourself with Xaman.</p>
        </div>
        <Button size="sm" variant="clay" loading={starting} onClick={start} icon={<Plus size={15} aria-hidden />}>Connect wallet</Button>
      </div>

      {loading && !data ? (
        <div className="skeleton h-16" />
      ) : error && !data ? (
        <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><div className="grid gap-2"><span>We couldn&apos;t load your wallets.</span><Button size="sm" variant="clay" onClick={reload}>Try again</Button></div></div>
      ) : wallets.length === 0 ? (
        <p className="clay-inset m-0 flex items-center gap-3 px-4 py-4 text-[0.92rem] text-ink-soft"><Wallet size={18} aria-hidden />No wallets yet.</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {wallets.map((w) => (
            <li key={w.id} className="clay-inset flex flex-wrap items-center gap-3 px-4 py-3.5">
              <span className="grid size-10 flex-none place-items-center rounded-full bg-brand-50 text-brand-700"><Wallet size={18} aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <code className="block truncate font-mono text-[0.88rem] font-semibold">{w.address}</code>
                <span className="text-[0.78rem] text-ink-faint">Connected {formatDate(w.connected_at)}{w.last_used_at ? ` · Last used ${formatDate(w.last_used_at)}` : ""}</span>
              </div>
              <CopyButton text={w.address} label="wallet address" />
              <button type="button" className="icon-btn size-8! text-danger!" onClick={() => setToRemove(w)} aria-label={`Remove wallet ${w.address}`}><Trash2 size={14} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}

      <ConnectModal request={request} onClose={() => setRequest(null)} onConnected={reload} />
      <ConfirmDialog open={!!toRemove} title="Remove this wallet?" text="It's only removed from your Ahia account. Nothing happens to the wallet itself, and you can connect it again later." confirmLabel="Remove wallet" danger loading={busy} onConfirm={remove} onClose={() => setToRemove(null)} />
    </section>
  );
}
