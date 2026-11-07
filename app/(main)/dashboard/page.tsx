"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Check,
  Clock,
  CreditCard,
  Hourglass,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api, formatMoney, type Currency } from "@/lib/api";

interface SellerSummary {
  pendingPayout: Record<string, number>;
  availableToWithdraw: Record<string, number>;
  pendingSales: { count: number };
}

// One orchestrated entrance for the whole page
const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 24 } },
};

function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [summary, setSummary] = useState<SellerSummary | null>(null);
  const [accounts, setAccounts] = useState<number | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    api.get<SellerSummary>("/seller/summary").then(setSummary).catch(() => setSummary(null));
    api.get<{ accounts: unknown[] }>("/payouts/accounts").then((d) => setAccounts(d.accounts.length)).catch(() => setAccounts(0));
    refreshUser(); // pick up KYC approval or email verification done elsewhere
  }, [refreshUser]);

  if (!user) return null;

  const currencies = Array.from(
    new Set<string>([user.currency, ...Object.keys(summary?.availableToWithdraw ?? {}), ...Object.keys(summary?.pendingPayout ?? {})])
  );

  const emailDone = !!user.email_verified_at;
  const kycDone = user.kyc_status === "approved";
  const payoutDone = (accounts ?? 0) > 0;
  const done = [emailDone, kycDone, payoutDone].filter(Boolean).length;

  const resend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification");
      toast.success(`Verification email sent to ${user.email}`);
    } catch {
      toast.error("Couldn't send the email. Try again in a moment.");
    } finally {
      setResending(false);
    }
  };

  const kycText =
    user.kyc_status === "pending" ? "Under review. We'll notify you when it's done."
    : user.kyc_status === "rejected" ? "Your last submission was rejected. You can submit again."
    : kycDone ? "Your ID is verified."
    : "Required before you can list items.";

  const steps = [
    {
      key: "email",
      done: emailDone,
      title: "Verify your email",
      text: emailDone ? "Your email is verified." : `We sent a link to ${user.email}.`,
      action: emailDone ? null : <Button size="sm" variant="clay" loading={resending} onClick={resend}>Resend email</Button>,
    },
    {
      key: "kyc",
      done: kycDone,
      title: "Verify your ID",
      text: kycText,
      action: kycDone || user.kyc_status === "pending" ? null : (
        <ButtonLink href="/kyc" size="sm" aria-disabled={!emailDone} tabIndex={emailDone ? undefined : -1}>
          {user.kyc_status === "rejected" ? "Submit again" : "Verify ID"}
        </ButtonLink>
      ),
    },
    {
      key: "payout",
      done: payoutDone,
      title: "Add a payout account",
      text: payoutDone ? "You're set up to withdraw earnings." : "Where we send your earnings.",
      action: payoutDone ? null : (
        <ButtonLink href="/payouts" size="sm" aria-disabled={!kycDone} tabIndex={kycDone ? undefined : -1}>
          Add account
        </ButtonLink>
      ),
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-8 [&_h1]:mb-1">
        <h1>Welcome back, {user.first_name}</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          {user.university_name}
          {user.campus_location ? `, ${user.campus_location}` : ""}
        </p>
      </motion.div>

      <motion.div variants={item} className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-5">
        {!summary
          ? [0, 1].map((i) => <div key={i} className="skeleton" style={{ height: "7.5rem" }} />)
          : currencies.flatMap((c) => [
              <div key={`${c}-a`} className="clay grid gap-1.5 p-6">
                <div className="flex items-center gap-3 text-[0.92rem] font-semibold text-ink-soft">
                  <span className="clay-sm grid size-10 place-items-center text-brand-700"><Wallet size={18} aria-hidden /></span>
                  Available to withdraw
                </div>
                <div className="font-heading text-[1.7rem] font-extrabold tracking-tight">{formatMoney(summary.availableToWithdraw[c] ?? 0, c as Currency)}</div>
                <div className="text-[0.85rem] text-ink-faint">Released from escrow</div>
              </div>,
              <div key={`${c}-p`} className="clay grid gap-1.5 p-6">
                <div className="flex items-center gap-3 text-[0.92rem] font-semibold text-ink-soft">
                  <span className="clay-sm grid size-10 place-items-center text-brand-700"><Hourglass size={18} aria-hidden /></span>
                  Pending in escrow
                </div>
                <div className="font-heading text-[1.7rem] font-extrabold tracking-tight">{formatMoney(summary.pendingPayout[c] ?? 0, c as Currency)}</div>
                <div className="text-[0.85rem] text-ink-faint">
                  {summary.pendingSales.count > 0 ? `${summary.pendingSales.count} sale${summary.pendingSales.count > 1 ? "s" : ""} waiting for buyer confirmation` : "No sales waiting"}
                </div>
              </div>,
            ])}
      </motion.div>

      <div className="grid items-start gap-6 md:grid-cols-[3fr_2fr]">
        <motion.section variants={item} className="clay p-6" aria-labelledby="setup-title">
          <h2 id="setup-title" className="mb-1 text-xl">{done === 3 ? "You're ready to sell" : "Get ready to sell"}</h2>
          <p className="text-muted" style={{ margin: 0 }}>{done} of 3 steps complete</p>
          <div className="my-4 mb-5 h-2.5 overflow-hidden rounded-full bg-surface-inset shadow-[var(--clay-pressed)]" aria-hidden>
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-brand-300 to-brand-500"
              initial={{ width: 0 }}
              animate={{ width: `${(done / 3) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.3 }}
            />
          </div>
          <ol className="m-0 grid list-none gap-3.5 p-0">
            {steps.map((s, i) => (
              <li key={s.key} className="clay-sm flex items-center gap-3.5 px-4 py-3.5">
                <span className={`grid size-10 flex-none place-items-center rounded-full ${s.done ? "bg-linear-to-br from-[#5cc189] to-success text-white shadow-[2px_3px_6px_rgb(47_125_79/0.4),inset_2px_2px_4px_rgb(255_255_255/0.4)]" : "bg-surface-inset text-ink-faint shadow-[var(--clay-pressed)]"}`}>
                  {s.done ? <Check size={18} aria-hidden /> : i === 1 && user.kyc_status === "pending" ? <Clock size={18} aria-hidden /> : i === 1 ? <ShieldCheck size={18} aria-hidden /> : i === 2 ? <CreditCard size={18} aria-hidden /> : <span aria-hidden>{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1 [&_span]:text-[0.88rem] [&_span]:text-ink-soft [&_strong]:block [&_strong]:font-heading [&_strong]:text-[0.98rem]">
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </div>
                {s.action}
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section variants={item} aria-label="Quick links">
          <div className="grid grid-cols-2 gap-4">
            {[
              { href: "/products", label: "Browse items", icon: Search },
              { href: "/orders", label: "My orders", icon: Package },
              { href: "/sell", label: "My listings", icon: Store },
              { href: "/messages", label: "Messages", icon: MessageCircle },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="clay-sm clay-press grid justify-items-start gap-3 p-5 font-heading font-bold text-ink no-underline">
                <span className="clay-sm grid size-11 place-items-center text-brand-700"><Icon size={20} aria-hidden /></span>
                {label}
              </Link>
            ))}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
