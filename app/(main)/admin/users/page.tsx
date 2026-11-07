"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Search, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { useAuth } from "@/components/auth/AuthProvider";
import { PersonAvatar } from "@/components/messages/Avatar";
import { EmptyState, Pagination } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import { KYC_LABEL, KYC_TONE, type AdminUser } from "@/lib/admin";
import { cx } from "@/lib/cx";
import { formatDate } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

const LIMIT = 20;

function UsersList() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user: me } = useAuth();
  const q = sp.get("q") ?? "";
  const page = Number(sp.get("page")) || 1;
  const [input, setInput] = useState(q);
  const { data, loading, error, reload } = useApi<{ users: AdminUser[] }>("/admin/users", { q, page, limit: LIMIT });
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    router.replace(next.size ? `/admin/users?${next}` : "/admin/users", { scroll: false });
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    go({ q: input.trim() });
  };

  const toggle = async () => {
    if (!target) return;
    const next = target.status === "active" ? "suspended" : "active";
    setBusy(true);
    try {
      await api.patch(`/admin/users/${target.id}/status`, { status: next });
      toast.success(next === "suspended" ? "User suspended and logged out everywhere" : "User reactivated");
      setTarget(null);
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the user");
    } finally {
      setBusy(false);
    }
  };

  const list = data?.users ?? [];
  const pages = list.length >= LIMIT ? page + 1 : page;

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">Users</span>
      </nav>
      <h1 className="mb-1">Users</h1>
      <p className="mb-6 text-ink-soft">Search by email or display name. Suspending someone logs them out everywhere.</p>

      <form onSubmit={onSearch} className="mb-6 flex flex-wrap gap-3" role="search">
        <div className="input-wrap min-w-64 flex-1" data-icon="true">
          <Search className="input-icon" size={18} aria-hidden />
          <input className="input-el" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Email or name" aria-label="Search users" />
        </div>
        <Button type="submit" size="lg">Search</Button>
        {q && <Button variant="ghost" size="lg" onClick={() => { setInput(""); go({ q: "" }); }}>Clear</Button>}
      </form>

      {loading && !data ? (
        <div className="grid gap-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-lg" />)}</div>
      ) : error && !data ? (
        <EmptyState icon={<Users size={32} aria-hidden />} title="We couldn't load users" action={<Button onClick={reload}>Try again</Button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Users size={32} aria-hidden />} title="No users found" text={q ? "Try a different name or email." : undefined} />
      ) : (
        <>
          <ul className="m-0 grid list-none gap-3 p-0">
            {list.map((u) => {
              const self = u.id === me?.id;
              const suspended = u.status === "suspended";
              return (
                <li key={u.id} className="card grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
                  <PersonAvatar name={u.display_name} src={null} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-heading">{u.display_name}</strong>
                      {u.role === "admin" && <span className="badge badge-brand">Admin</span>}
                      {suspended && <span className="badge badge-danger">Suspended</span>}
                      <span className={cx("badge", KYC_TONE[u.kyc_status])}>{KYC_LABEL[u.kyc_status]}</span>
                    </div>
                    <span className="block truncate text-[0.88rem] text-ink-soft">{u.email}{u.phone ? ` · ${u.phone}` : ""}</span>
                    <span className="text-[0.78rem] text-ink-faint">Joined {formatDate(u.created_at)} · #{u.id}</span>
                  </div>
                  <div className="col-span-full sm:col-auto">
                    {self ? (
                      <span className="text-[0.82rem] text-ink-faint">This is you</span>
                    ) : suspended ? (
                      <Button size="sm" onClick={() => setTarget(u)} icon={<ShieldCheck size={15} aria-hidden />}>Reactivate</Button>
                    ) : (
                      <Button size="sm" variant="clay" className="text-danger!" onClick={() => setTarget(u)} icon={<ShieldAlert size={15} aria-hidden />}>Suspend</Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={page} pages={pages} onChange={(n) => go({ page: String(n) })} />
        </>
      )}

      <ConfirmDialog
        open={!!target}
        title={target?.status === "active" ? "Suspend this user?" : "Reactivate this user?"}
        text={target ? (target.status === "active" ? `${target.display_name} won't be able to log in, and all of their sessions end right away.` : `${target.display_name} will be able to log in again.`) : ""}
        confirmLabel={target?.status === "active" ? "Suspend" : "Reactivate"}
        danger={target?.status === "active"}
        loading={busy}
        onConfirm={toggle}
        onClose={() => setTarget(null)}
      />
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <RequireAuth role="admin">
      <Suspense fallback={null}>
        <UsersList />
      </Suspense>
    </RequireAuth>
  );
}
