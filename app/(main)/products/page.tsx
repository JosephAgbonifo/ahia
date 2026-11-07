"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Info, PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FilterPanel, type Filters } from "@/components/shop/FilterPanel";
import { EmptyState, Pagination, ProductGrid } from "@/components/shop/ProductGrid";
import { CONDITION_LABEL, flattenCategories, type ProductList } from "@/lib/shop";
import { useApi } from "@/lib/useApi";
import { useCategories } from "@/lib/useCategories";

const LIMIT = 24;
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

function ProductsContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const { categories } = useCategories();
  const [drawer, setDrawer] = useState(false);

  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? "newest";
  const page = Number(sp.get("page")) || 1;
  const filters: Filters = {
    category: sp.get("category") ?? "",
    condition: sp.get("condition") ?? "",
    minPrice: sp.get("minPrice") ?? "",
    maxPrice: sp.get("maxPrice") ?? "",
  };

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page"); // any filter change returns to page 1
    const qs = next.toString();
    router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });
  };

  const { data, loading, error, reload } = useApi<ProductList>("/products", {
    q, sort, page, limit: LIMIT,
    category: filters.category, condition: filters.condition,
    minPrice: filters.minPrice, maxPrice: filters.maxPrice,
  });

  const flat = useMemo(() => flattenCategories(categories), [categories]);
  const activeCategory = flat.find((c) => String(c.id) === filters.category);
  const hasActive = !!(filters.category || filters.condition || filters.minPrice || filters.maxPrice);

  const chips: { label: string; clear: () => void }[] = [];
  if (q) chips.push({ label: `"${q}"`, clear: () => setParams({ q: null }) });
  if (activeCategory) chips.push({ label: activeCategory.name, clear: () => setParams({ category: null }) });
  if (filters.condition) chips.push({ label: CONDITION_LABEL[filters.condition as keyof typeof CONDITION_LABEL] ?? filters.condition, clear: () => setParams({ condition: null }) });
  if (filters.minPrice || filters.maxPrice) chips.push({ label: `Price ${filters.minPrice || "0"} to ${filters.maxPrice || "any"}`, clear: () => setParams({ minPrice: null, maxPrice: null }) });

  const clearAll = () => router.replace(q ? `/products?q=${encodeURIComponent(q)}` : "/products", { scroll: false });
  const title = q ? `Results for "${q}"` : activeCategory ? activeCategory.name : "All products";

  const panel = (
    <FilterPanel
      categories={categories}
      filters={filters}
      hasActive={hasActive}
      onClear={clearAll}
      onChange={(patch) => { setParams(patch as Record<string, string | null>); setDrawer(false); }}
    />
  );

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight size={14} aria-hidden />
        <span aria-current="page">{title}</span>
      </nav>

      <div className="grid items-start gap-6 md:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside className="sticky top-36 hidden md:block" aria-label="Filters">{panel}</aside>

        <section aria-label="Results">
          <div className="card mb-4.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3.5">
            <div>
              <h1 className="m-0 text-[1.15rem]">{title}</h1>
              <p className="m-0 text-[0.88rem] text-ink-soft" aria-live="polite">{loading ? "Loading…" : `${data?.page.total ?? 0} item${data?.page.total === 1 ? "" : "s"} found`}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="clay" size="sm" className="md:hidden" onClick={() => setDrawer(true)} icon={<SlidersHorizontal size={16} aria-hidden />}>
                Filters
              </Button>
              <label className="sr-only" htmlFor="sort">Sort by</label>
              <select id="sort" className="min-h-10 cursor-pointer rounded-md border-0 bg-surface-inset px-3.5 pr-8 font-semibold shadow-[var(--clay-pressed)]" value={sort} onChange={(e) => setParams({ sort: e.target.value === "newest" ? null : e.target.value })}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {data?.scope === "all_universities" && (
            <div className="alert alert-info" style={{ marginBottom: "1.1rem" }}>
              <Info size={18} aria-hidden />
              <span>You&apos;re seeing items from every university. <Link href="/login?next=/products">Log in</Link> to shop only on your campus.</span>
            </div>
          )}

          {chips.length > 0 && (
            <div className="mb-4.5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c.label} type="button" className="inline-flex items-center gap-1.5 rounded-full border-0 bg-brand-100 py-1.5 pr-2 pl-3.5 text-[0.85rem] font-bold text-brand-800 hover:bg-brand-200" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
                  {c.label}<X size={14} aria-hidden />
                </button>
              ))}
            </div>
          )}

          {error ? (
            <EmptyState icon={<PackageSearch size={32} aria-hidden />} title="We couldn't load products" text="Check your connection and try again." action={<Button onClick={reload}>Try again</Button>} />
          ) : (
            <>
              <ProductGrid
                products={data?.products}
                loading={loading}
                skeletons={8}
                empty={
                  <EmptyState
                    icon={<PackageSearch size={32} aria-hidden />}
                    title="No items match your search"
                    text="Try a different word, or remove some filters."
                    action={hasActive || q ? <Button variant="clay" onClick={() => router.replace("/products")}>Clear search and filters</Button> : <ButtonLink href="/sell" size="sm">Be the first to list</ButtonLink>}
                  />
                }
              />
              {data && <Pagination page={data.page.page} pages={data.page.pages} onChange={(p) => { setParams({ page: String(p) }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-80 bg-ink/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.div className="fixed inset-y-0 left-0 z-90 flex w-[min(88vw,23rem)] flex-col bg-page" role="dialog" aria-modal="true" aria-label="Filters" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 340, damping: 34 }}>
              <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4 [&_h2]:m-0 [&_h2]:text-[1.1rem]">
                <h2>Filters</h2>
                <Button variant="ghost" size="sm" onClick={() => setDrawer(false)} icon={<X size={18} aria-hidden />}>Close</Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{panel}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsContent />
    </Suspense>
  );
}
