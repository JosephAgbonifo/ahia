"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Banknote, Coins, Hourglass, Landmark, Plus, Star, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { useAuth } from "@/components/auth/AuthProvider";
import { AddAccountModal } from "@/components/payouts/AddAccountModal";
import { SellerGate } from "@/components/sell/SellerGate";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { api, ApiError, formatMoney, type Currency } from "@/lib/api";
import { cx } from "@/lib/cx";
import { accountLabel, PAYOUT_STATUS, type Payout, type PayoutAccount, type SellerSummary } from "@/lib/payouts";
import { formatDateTime } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const HISTORY_LIMIT = 10;

function Payouts() {
  const { user } = useAuth();
  const summary = useApi<SellerSummary>("/seller/summary");
  const accounts = useApi<{ accounts: PayoutAccount[] }>("/payouts/accounts");
  const [historyPage, setHistoryPage] = useState(1);
  const history = useApi<{ payouts: Payout[] }>("/payouts", { page: historyPage, limit: HISTORY_LIMIT });

  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<"bank" | "xrp">("bank");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [withdrawing, setWithdrawing] = useState<{ currency: string; account: PayoutAccount; amount: number } | null>(null);
  const [toDelete, setToDelete] = useState<PayoutAccount | null>(null);
  const [busy, setBusy] = useState(false);

  const list = accounts.data?.accounts ?? [];
  const currencies = useMemo(
    () => Array.from(new Set<string>([user?.currency ?? "NGN", ...Object.keys(summary.data?.balances ?? {})])),
    [summary.data, user?.currency]
  );

  const refreshAll = () => {
    summary.reload();
    accounts.reload();
    history.reload();
  };

  const openAdd = (kind: "bank" | "xrp") => {
    setAddKind(kind);
    setAddOpen(true);
  };

  const withdraw = async () => {
    if (!withdrawing) return;
    setBusy(true);
    try {
      await api.post("/payouts", { payoutAccountId: withdrawing.account.id });
      toast.success("Withdrawal requested. We'll send it and mark it paid.");
      setWithdrawing(null);
      setHistoryPage(1);
      refreshAll();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't request the withdrawal");
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (a: PayoutAccount) => {
    try {
      await api.post(`/payouts/accounts/${a.id}/default`);
      accounts.reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't change the default account");
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.delete(`/payouts/accounts/${toDelete.id}`);
      toast.success("Account removed");
      setToDelete(null);
      accounts.reload();
    } catch (e) {
      toast.error(e instanceof ApiError && e.code === "ACCOUNT_IN_USE" ? "This account has payout history, so it can't be deleted." : e instanceof ApiError ? e.message : "Couldn't remove the account");
      setToDelete(null);
    } finally {
      setBusy(false);
    }
  };

  const payouts = history.data?.payouts ?? [];
  const historyPages = payouts.length >= HISTORY_LIMIT ? historyPage + 1 : historyPage;

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-1">Earnings and payouts</h1>
        <p className="m-0 text-ink-soft">See what you&apos;ve earned and withdraw it to your bank account or XRPL wallet.</p>
      </div>

      {/* Balances and withdraw */}
      <section className="mb-8 grid gap-5" aria-label="Balances">
        {summary.loading && !summary.data ? (
          <div className="skeleton h-44 rounded-lg" />
        ) : summary.error && !summary.data ? (
          <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><div className="grid gap-2"><span>We couldn&apos;t load your balance.</span><Button size="sm" variant="clay" onClick={summary.reload}>Try again</Button></div></div>
        ) : (
          currencies.map((c) => {
            const bal = summary.data?.balances[c] ?? { pending: 0, available: 0, withdrawn: 0 };
            const matching = list.filter((a) => a.currency === c);
            const chosenId = picked[c] ?? String(matching.find((a) => a.isDefault)?.id ?? matching[0]?.id ?? "");
            const chosen = matching.find((a) => String(a.id) === chosenId);
            const cur = c as Currency;
            return (
              <div key={c} className="card grid gap-5 p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Available to withdraw", value: bal.available, icon: Wallet, big: true },
                    { label: "Pending in escrow", value: bal.pending, icon: Hourglass },
                    { label: "Requested for withdrawal", value: bal.withdrawn, icon: Banknote },
                  ].map(({ label, value, icon: Icon, big }) => (
                    <div key={label} className="clay-inset grid gap-1 p-4">
                      <span className="flex items-center gap-2 text-[0.85rem] font-semibold text-ink-soft"><Icon size={16} aria-hidden />{label}</span>
                      <span className={cx("font-heading font-extrabold tracking-tight", big ? "text-2xl text-brand-700" : "text-xl")}>{formatMoney(value, cur)}</span>
                    </div>
                  ))}
                </div>

                {bal.available > 0 && (
                  matching.length === 0 ? (
                    <div className="alert alert-warning" role="status">
                      <AlertCircle size={18} aria-hidden />
                      <div className="grid gap-2.5">
                        <span>Add {c === "RLUSD" || c === "XRP" ? "an XRPL address" : "a bank account"} to withdraw your {c} earnings.{c === "RLUSD" ? " The address needs a trust line for RLUSD." : ""}</span>
                        <Button size="sm" onClick={() => openAdd(c === "RLUSD" || c === "XRP" ? "xrp" : "bank")} icon={<Plus size={15} aria-hidden />}>{c === "RLUSD" || c === "XRP" ? "Add XRPL address" : "Add bank account"}</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-3">
                      {matching.length > 1 && (
                        <div className="field min-w-56 flex-1">
                          <label className="label" htmlFor={`acct-${c}`}>Send to</label>
                          <div className="input-wrap">
                            <select id={`acct-${c}`} className="input-el" value={chosenId} onChange={(e) => setPicked((p) => ({ ...p, [c]: e.target.value }))}>
                              {matching.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                      <Button size="lg" disabled={!chosen} onClick={() => chosen && setWithdrawing({ currency: c, account: chosen, amount: bal.available })} icon={<Banknote size={18} aria-hidden />}>
                        Withdraw {formatMoney(bal.available, cur)}
                      </Button>
                    </div>
                  )
                )}
                {bal.available === 0 && <p className="m-0 text-[0.9rem] text-ink-soft">Nothing to withdraw yet. Earnings move here once buyers confirm and refund windows close.</p>}
              </div>
            );
          })
        )}
      </section>

      {/* Accounts */}
      <section className="mb-8" aria-labelledby="accounts-h">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="accounts-h" className="m-0 text-xl">Payout accounts</h2>
          <Button size="sm" variant="clay" disabled={list.length >= 5} onClick={() => openAdd("bank")} icon={<Plus size={15} aria-hidden />}>Add account</Button>
        </div>
        {accounts.loading && !accounts.data ? (
          <div className="skeleton h-24 rounded-lg" />
        ) : list.length === 0 ? (
          <EmptyState icon={<Landmark size={32} aria-hidden />} title="No payout accounts yet" text="Add a bank account for naira or dollars, or an XRPL address for RLUSD sales." action={<div className="flex flex-wrap justify-center gap-3"><Button onClick={() => openAdd("bank")}>Add bank account</Button><Button variant="clay" onClick={() => openAdd("xrp")}>Add XRPL address</Button></div>} />
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {list.map((a) => (
              <li key={a.id} className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:px-6">
                <span className="grid size-11 flex-none place-items-center rounded-full bg-brand-50 text-brand-700">{a.type === "bank" ? <Landmark size={20} aria-hidden /> : <Coins size={20} aria-hidden />}</span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate font-heading">{a.type === "bank" ? `${a.bankName} ${a.accountNumberMasked ?? ""}` : "XRPL address"}</strong>
                  <span className="block truncate text-[0.85rem] text-ink-soft">{a.type === "bank" ? a.accountName : `${a.xrpAddress}${a.xrpDestTag !== null ? ` · tag ${a.xrpDestTag}` : ""}`}</span>
                </div>
                <span className="badge">{a.currency}</span>
                {a.isDefault ? <span className="badge badge-success"><Star size={12} aria-hidden fill="currentColor" />Default</span> : <Button size="sm" variant="ghost" onClick={() => makeDefault(a)}>Make default</Button>}
                <Button size="sm" variant="ghost" className="text-danger!" onClick={() => setToDelete(a)} icon={<Trash2 size={15} aria-hidden />} aria-label={`Remove ${accountLabel(a)}`}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
        {list.length >= 5 && <p className="mt-3 text-[0.85rem] text-ink-soft">You&apos;ve reached the limit of 5 payout accounts. Remove one to add another.</p>}
      </section>

      {/* History */}
      <section aria-labelledby="history-h">
        <h2 id="history-h" className="mb-4 text-xl">Payout history</h2>
        {history.loading && !history.data ? (
          <div className="skeleton h-32 rounded-lg" />
        ) : payouts.length === 0 ? (
          <EmptyState icon={<Banknote size={32} aria-hidden />} title="No payouts yet" text="Your withdrawals show up here with their status." />
        ) : (
          <>
            <ul className="m-0 grid list-none gap-3 p-0">
              {payouts.map((p) => {
                const st = PAYOUT_STATUS[p.status];
                return (
                  <li key={p.id} className="card grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 p-4 sm:px-6">
                    <div>
                      <span className="price text-lg">{formatMoney(p.amount_minor, p.currency)}</span>
                      <p className="m-0 text-[0.82rem] text-ink-faint">Requested {formatDateTime(p.requested_at)}{p.completed_at ? ` · Finished ${formatDateTime(p.completed_at)}` : ""}</p>
                    </div>
                    <span className={cx("badge", st.tone)}>{st.label}</span>
                    {p.status === "failed" && <p className="col-span-full m-0 text-[0.85rem] text-danger">{p.failure_reason ? `${p.failure_reason}. ` : ""}The money is back in your available balance.</p>}
                  </li>
                );
              })}
            </ul>
            <Pagination page={historyPage} pages={historyPages} onChange={setHistoryPage} />
          </>
        )}
      </section>

      <AddAccountModal open={addOpen} initialKind={addKind} campusCurrency={user?.currency ?? "NGN"} onClose={() => setAddOpen(false)} onAdded={accounts.reload} />

      <ConfirmDialog
        open={!!withdrawing}
        title="Withdraw your earnings?"
        text={withdrawing ? `${formatMoney(withdrawing.amount, withdrawing.currency as Currency)} will be sent to ${accountLabel(withdrawing.account)}. This withdraws everything available in ${withdrawing.currency}, and our team pays it out manually.${withdrawing.currency === "RLUSD" ? " Make sure this address has a trust line for RLUSD, or the payout can fail." : ""}` : ""}
        confirmLabel="Withdraw"
        loading={busy}
        onConfirm={withdraw}
        onClose={() => setWithdrawing(null)}
      />
      <ConfirmDialog open={!!toDelete} title="Remove this account?" text={toDelete ? `${accountLabel(toDelete)} will be removed. Accounts with payout history can't be deleted.` : ""} confirmLabel="Remove" danger loading={busy} onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}

export default function PayoutsPage() {
  return (
    <RequireAuth>
      <SellerGate>
        <Payouts />
      </SellerGate>
    </RequireAuth>
  );
}
