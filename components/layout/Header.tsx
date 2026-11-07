"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  ShoppingCart,
  Store,
  User as UserIcon,
  Wallet,
  X,
  Grid2x2,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import type { User } from "@/lib/api";
import { cx } from "@/lib/cx";
import { useCategories } from "@/lib/useCategories";
import { useBadgeCounts } from "./useBadgeCounts";


const ACTION =
  "relative flex items-center gap-2 rounded-md px-3 py-2 text-[0.92rem] font-semibold text-ink no-underline hover:bg-brand-50 aria-[current=page]:text-brand-700";
const MENU_ITEM =
  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[0.95rem] font-semibold text-ink no-underline hover:bg-brand-50 focus-visible:bg-brand-50 [&_svg]:shrink-0 [&_svg]:text-ink-soft";
const DANGER = "!text-danger [&_svg]:!text-danger";
const NAV_LINK =
  "rounded-md px-3 py-2.5 text-[0.92rem] font-semibold no-underline whitespace-nowrap hover:bg-brand-50 hover:text-brand-700";
const GRADIENT_BTN = "bg-linear-to-br from-brand-300 via-brand-500 to-brand-600 text-on-primary hover:brightness-105";

const KYC_LABEL: Record<User["kyc_status"], { text: string; tone: string }> = {
  none: { text: "ID not verified", tone: "" },
  pending: { text: "ID under review", tone: "badge-warning" },
  approved: { text: "Verified seller", tone: "badge-success" },
  rejected: { text: "ID rejected", tone: "badge-danger" },
};

interface MenuLink { href: string; label: string; icon: LucideIcon; count?: number }

const accountLinks = (user: User, fulfil = 0): MenuLink[] => [
  { href: user.role === "admin" ? "/admin" : "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "My orders", icon: Package },
  { href: "/wishlist", label: "Saved items", icon: Heart },
  { href: "/sell", label: "My listings", icon: Store },
  ...(user.kyc_status === "approved" ? [{ href: "/sell/orders", label: "Orders to fulfil", icon: Truck, count: fulfil }] : []),
  { href: "/payouts", label: "Earnings and payouts", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
  ...(user.role === "admin" ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
];

const initials = (u: User) => `${u.first_name[0] ?? ""}${u.last_name[0] ?? ""}`.toUpperCase();

function Avatar({ user }: { user: User }) {
  return (
    <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-linear-to-br from-brand-300 to-brand-500 font-heading text-[0.8rem] font-extrabold text-on-primary">
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar_url} alt="" className="size-full object-cover" />
      ) : (
        initials(user)
      )}
    </span>
  );
}

function ActionLink({ href, label, icon: Icon, count }: { href: string; label: string; icon: LucideIcon; count?: number }) {
  const pathname = usePathname();
  return (
    <Link href={href} className={ACTION} aria-label={count ? `${label}, ${count} new` : label} aria-current={pathname.startsWith(href) ? "page" : undefined}>
      <Icon size={22} aria-hidden />
      <span className="hidden md:inline">{label}</span>
      <AnimatePresence>
        {!!count && (
          <motion.span key={count} className="absolute top-0 left-6 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.7rem] leading-none font-extrabold text-white" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} aria-hidden>
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

function AccountMenu({ user, fulfil }: { user: User; fulfil: number }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const kyc = KYC_LABEL[user.kyc_status];

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" className={ACTION} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Open account menu">
        <Avatar user={user} />
        <span className="hidden md:inline">Hi, {user.first_name}</span>
        <ChevronDown size={16} aria-hidden className="hidden md:block" style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" className="clay absolute top-[calc(100%+0.6rem)] right-0 z-70 w-68 origin-top-right p-2.5" initial={{ opacity: 0, scale: 0.94, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 380, damping: 28 }}>
            <div className="mb-1.5 border-b border-line px-3 pt-2.5 pb-3">
              <strong className="block font-heading">{user.display_name}</strong>
              <span className="block truncate text-[0.85rem] text-ink-soft">{user.email}</span>
              <span className="block truncate text-[0.85rem] text-ink-soft">{user.university_short_name ?? user.university_name}</span>
              <span className={cx("badge mt-2", kyc.tone)}>{kyc.text}</span>
            </div>
            {accountLinks(user, fulfil).map(({ href, label, icon: Icon, count }) => (
              <Link key={label} href={href} role="menuitem" className={MENU_ITEM}>
                <Icon size={18} aria-hidden />
                {label}
                {!!count && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.7rem] font-extrabold text-white">{count > 99 ? "99+" : count}</span>}
              </Link>
            ))}
            <div className="my-1.5 h-px bg-line" />
            <button type="button" role="menuitem" className={cx(MENU_ITEM, DANGER)} onClick={logout}>
              <LogOut size={18} aria-hidden />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { categories } = useCategories();
  const counts = useBadgeCounts(status === "authenticated", user?.kyc_status === "approved");

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [mega, setMega] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawer(false);
    setMega(false);
  }, [pathname]);

  useEffect(() => {
    if (!mega) return;
    const onClick = (e: MouseEvent) => !navRef.current?.contains(e.target as Node) && setMega(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMega(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [mega]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (cat) params.set("category", cat);
    router.push(`/products${params.size ? `?${params}` : ""}`);
  };

  const searchForm = (withSelect: boolean) => (
    <form onSubmit={onSearch} role="search" style={{ width: "100%" }}>
      <div className="input-wrap min-h-12 w-full overflow-hidden rounded-lg">
        {withSelect && (
          <select className="max-w-44 cursor-pointer border-0 border-r border-line bg-transparent px-3.5 text-[0.9rem] font-semibold outline-none" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <input className="min-w-0 flex-1 border-0 bg-transparent px-4 outline-none" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, brands and categories" aria-label="Search products" />
        <button type="submit" className={cx("inline-flex cursor-pointer items-center gap-1.5 border-0 px-5 font-heading font-bold", GRADIENT_BTN)} aria-label="Search">
          <Search size={20} aria-hidden />
          <span className="hidden lg:inline">Search</span>
        </button>
      </div>
    </form>
  );

  const campus = user ? (user.university_short_name ?? user.university_name) : null;

  return (
    <>
      <div className="border-b border-line bg-brand-50 text-[0.82rem] text-ink-soft">
        <div className="container flex min-h-9 items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <MapPin size={14} aria-hidden />
            {campus ? `Shopping on ${campus}` : "Browsing all campuses"}
          </span>
          <nav className="hidden gap-6 sm:flex [&_a]:font-semibold [&_a]:text-ink-soft [&_a]:no-underline [&_a:hover]:text-brand-700" aria-label="Quick links">
            <Link href={user ? "/sell" : "/register"}>Sell on Ahia</Link>
            <Link href="/products">Today&apos;s listings</Link>
            <Link href="/help">Help</Link>
          </nav>
        </div>
      </div>

      <header className="sticky top-0 z-60 bg-surface shadow-[0_1px_0_var(--line),0_6px_20px_rgb(60_30_15/0.06)]">
        <div className="container">
          <div className="flex items-center gap-4 py-3.5 md:gap-8">
            <button type="button" className="icon-btn md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}>
              <Menu size={20} aria-hidden />
            </button>
            <div className="shrink-0"><Logo size={38} /></div>
            <div className="hidden min-w-0 flex-1 md:block">{searchForm(true)}</div>

            <div className="ml-auto flex items-center gap-1 md:ml-0">
              {status === "loading" && <div className="skeleton" style={{ width: 120, height: 44, borderRadius: 12 }} aria-hidden />}

              {status !== "loading" && !user && (
                <>
                  <ActionLink href="/login" label="Log in" icon={UserIcon} />
                  <div className="ml-2 hidden gap-2 sm:flex">
                    <ButtonLink href="/register" size="sm">Sign up</ButtonLink>
                  </div>
                  <ActionLink href="/cart" label="Cart" icon={ShoppingCart} />
                </>
              )}

              {user && (
                <>
                  <AccountMenu user={user} fulfil={counts.fulfil} />
                  <span className="hidden items-center gap-0.5 sm:flex">
                    <ActionLink href="/messages" label="Messages" icon={MessageCircle} count={counts.messages} />
                    <ActionLink href="/notifications" label="Alerts" icon={Bell} count={counts.notifications} />
                  </span>
                  <ActionLink href="/cart" label="Cart" icon={ShoppingCart} count={counts.cart} />
                </>
              )}
            </div>
          </div>
          <div className="pb-3.5 md:hidden">{searchForm(false)}</div>
        </div>

        {/* Category navigation */}
        <div className="relative hidden border-t border-line md:block" ref={navRef}>
          <div className="container flex min-h-12 items-center gap-1">
            <button type="button" className={cx("mr-3 inline-flex items-center gap-2 rounded-md border-0 px-4.5 py-2.5 font-heading text-[0.9rem] font-bold", GRADIENT_BTN)} onClick={() => setMega((m) => !m)} aria-expanded={mega}>
              <Grid2x2 size={18} aria-hidden />
              All categories
              <ChevronDown size={16} aria-hidden style={{ transition: "transform .2s", transform: mega ? "rotate(180deg)" : "none" }} />
            </button>
            {categories.slice(0, 7).map((c) => (
              <Link key={c.id} href={`/products?category=${c.id}`} className={cx(NAV_LINK, "text-ink-soft")}>{c.name}</Link>
            ))}
            <Link href={user ? "/sell" : "/register"} className={cx(NAV_LINK, "ml-auto text-brand-700")}>Sell on Ahia</Link>
          </div>

          <AnimatePresence>
            {mega && (
              <motion.div className="absolute inset-x-0 top-full z-65 border-t border-line bg-surface shadow-[0_20px_40px_rgb(60_30_15/0.12)]" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <div className="container grid grid-cols-2 gap-x-8 gap-y-6 py-7 lg:grid-cols-4">
                  {categories.map((c) => (
                    <div key={c.id}>
                      <Link href={`/products?category=${c.id}`} className="mb-2 block font-heading font-bold text-ink no-underline hover:text-brand-700">{c.name}</Link>
                      <ul className="m-0 grid list-none gap-1 p-0 [&_a]:text-[0.92rem] [&_a]:text-ink-soft [&_a]:no-underline [&_a:hover]:text-brand-700 [&_a:hover]:underline">
                        {c.children.map((ch) => (
                          <li key={ch.id}><Link href={`/products?category=${ch.id}`}>{ch.name}</Link></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-80 bg-ink/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-90 flex w-[min(86vw,22rem)] flex-col bg-surface shadow-[10px_0_40px_rgb(0_0_0/0.2)]" role="dialog" aria-modal="true" aria-label="Menu" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 340, damping: 34 }}>
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <Logo size={34} />
                <button type="button" className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={20} aria-hidden /></button>
              </div>
              <div className="grid flex-1 content-start gap-1 overflow-y-auto p-4">
                {user && (
                  <>
                    <p className="mx-3 mt-4 mb-1 text-[0.78rem] font-bold text-ink-faint">Account</p>
                    {accountLinks(user, counts.fulfil).map(({ href, label, icon: Icon, count }) => (
                      <Link key={label} href={href} className={MENU_ITEM}><Icon size={18} aria-hidden />{label}{count ? ` (${count})` : ""}</Link>
                    ))}
                    <Link href="/messages" className={MENU_ITEM}><MessageCircle size={18} aria-hidden />Messages{counts.messages ? ` (${counts.messages})` : ""}</Link>
                    <Link href="/notifications" className={MENU_ITEM}><Bell size={18} aria-hidden />Notifications{counts.notifications ? ` (${counts.notifications})` : ""}</Link>
                  </>
                )}
                <p className="mx-3 mt-4 mb-1 text-[0.78rem] font-bold text-ink-faint">Shop by category</p>
                <Link href="/products" className={MENU_ITEM}>All products</Link>
                {categories.map((c) => (
                  <Link key={c.id} href={`/products?category=${c.id}`} className={MENU_ITEM}>{c.name}</Link>
                ))}
              </div>
              <div className="grid gap-2.5 border-t border-line px-5 py-4">
                {user ? (
                  <button type="button" className={cx("btn btn-clay btn-block", DANGER)} onClick={logout}><LogOut size={18} aria-hidden />Log out</button>
                ) : (
                  <>
                    <ButtonLink href="/register" block>Sign up</ButtonLink>
                    <ButtonLink href="/login" variant="clay" block>Log in</ButtonLink>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
