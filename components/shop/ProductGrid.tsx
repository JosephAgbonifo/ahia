"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { ProductSummary } from "@/lib/shop";
import { ProductCard } from "./ProductCard";

interface Props {
  products?: ProductSummary[];
  loading?: boolean;
  skeletons?: number;
  /** Denser grid with more columns on wide screens */
  columns?: "default" | "five" | "wide";
  empty?: ReactNode;
}

export function ProductGrid({ products, loading, skeletons = 8, columns = "default", empty }: Props) {
  const cls = cx(
    "grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4",
    columns === "five" && "xl:grid-cols-5",
    columns === "wide" && "xl:grid-cols-6"
  );

  if (loading) {
    return (
      <div className={cls} aria-busy="true" aria-label="Loading products">
        {Array.from({ length: skeletons }, (_, i) => (
          <div key={i} className="skeleton h-84 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!products?.length) return <>{empty}</>;

  return (
    <div className={cls}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card grid justify-items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-brand-50 text-brand-600">{icon}</span>
      <h3 className="m-0 text-xl">{title}</h3>
      {text && <p className="m-0 mb-2 max-w-104 text-ink-soft">{text}</p>}
      {action}
    </div>
  );
}

const PAGE_BTN =
  "inline-grid h-10 min-w-10 place-items-center rounded-md border border-line bg-surface px-3 font-bold text-ink hover:enabled:border-brand-400 hover:enabled:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-45 aria-[current=page]:border-transparent aria-[current=page]:bg-linear-to-br aria-[current=page]:from-brand-300 aria-[current=page]:to-brand-500 aria-[current=page]:text-on-primary";

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...nums].sort((a, b) => a - b);

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <button className={PAGE_BTN} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      {sorted.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - sorted[i - 1] > 1 && <span aria-hidden>…</span>}
          <button className={PAGE_BTN} aria-current={n === page ? "page" : undefined} onClick={() => onChange(n)}>
            {n}
          </button>
        </span>
      ))}
      <button className={PAGE_BTN} disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}
