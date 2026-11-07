"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Banknote, Flag, FolderTree, GraduationCap, PackageSearch, ShieldCheck, Undo2, Users, UserCog, type LucideIcon } from "lucide-react";
import { RequireAuth } from "@/components/auth/guards";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";

interface Queue {
  key: string;
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  endpoint: string;
  listKey: string;
}

const QUEUES: Queue[] = [
  { key: "kyc", label: "ID verifications", hint: "Waiting for review", href: "/admin/kyc", icon: ShieldCheck, endpoint: "/admin/kyc", listKey: "submissions" },
  { key: "refunds", label: "Refund requests", hint: "Open", href: "/admin/refunds", icon: Undo2, endpoint: "/admin/refunds", listKey: "refunds" },
  { key: "payouts", label: "Payouts", hint: "Requested by sellers", href: "/admin/payouts", icon: Banknote, endpoint: "/admin/payouts", listKey: "payouts" },
  { key: "reports", label: "User reports", hint: "Open", href: "/admin/reports", icon: Flag, endpoint: "/admin/reports", listKey: "reports" },
  { key: "flags", label: "Flagged buyers", hint: "Unresolved", href: "/admin/flags", icon: Users, endpoint: "/admin/flags", listKey: "flags" },
];

const MANAGE: { label: string; hint: string; href: string; icon: LucideIcon }[] = [
  { label: "Categories", hint: "What sellers can list under", href: "/admin/categories", icon: FolderTree },
  { label: "Universities and campuses", hint: "Registration and pickup points", href: "/admin/universities", icon: GraduationCap },
  { label: "Products", hint: "Look up, remove or restore listings", href: "/admin/products", icon: PackageSearch },
  { label: "Users", hint: "Search, suspend or reactivate", href: "/admin/users", icon: UserCog },
];

const LIMIT = 50;
const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 220, damping: 24 } },
};

function AdminDashboard() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  useEffect(() => {
    QUEUES.forEach((q) => {
      api
        .get<Record<string, unknown[]>>(q.endpoint, { limit: LIMIT })
        .then((d) => setCounts((c) => ({ ...c, [q.key]: d[q.listKey]?.length ?? 0 })))
        .catch(() => setCounts((c) => ({ ...c, [q.key]: null })));
    });
  }, []);

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-8 [&_h1]:mb-1">
        <h1>Admin, {user?.first_name}</h1>
        <p className="text-muted" style={{ margin: 0 }}>Everything waiting for a decision.</p>
      </motion.div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-5">
        {QUEUES.map(({ key, label, hint, href, icon: Icon }) => {
          const count = counts[key];
          return (
            <motion.div key={key} variants={item}>
              <Link href={href} className="clay clay-press grid gap-1.5 p-6 text-ink no-underline">
                <div className="flex items-center gap-3 text-[0.92rem] font-semibold text-ink-soft">
                  <span className="clay-sm grid size-10 place-items-center text-brand-700"><Icon size={18} aria-hidden /></span>
                  {label}
                </div>
                {count === undefined ? (
                  <div className="skeleton" style={{ height: "2.2rem", width: "4rem" }} />
                ) : (
                  <div className="font-heading text-4xl leading-none font-extrabold">{count === null ? "n/a" : count >= LIMIT ? `${LIMIT}+` : count}</div>
                )}
                <div className="text-[0.85rem] text-ink-faint">{count === null ? "Couldn't load" : hint}</div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <motion.h2 variants={item} className="mt-10 mb-4 text-xl">Manage the marketplace</motion.h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-5">
        {MANAGE.map(({ label, hint, href, icon: Icon }) => (
          <motion.div key={href} variants={item}>
            <Link href={href} className="clay clay-press grid gap-2 p-6 text-ink no-underline">
              <span className="clay-sm grid size-10 place-items-center text-brand-700"><Icon size={18} aria-hidden /></span>
              <strong className="font-heading">{label}</strong>
              <span className="text-[0.85rem] text-ink-soft">{hint}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth role="admin">
      <AdminDashboard />
    </RequireAuth>
  );
}
