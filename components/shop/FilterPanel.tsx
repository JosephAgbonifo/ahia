"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CONDITION_LABEL, type Category } from "@/lib/shop";

const ITEM =
  "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[0.92rem] text-ink-soft hover:bg-brand-50 hover:text-ink aria-[current=true]:bg-brand-50 aria-[current=true]:font-bold aria-[current=true]:text-brand-700";
const RADIO = "flex cursor-pointer items-center gap-2.5 px-1 py-1.5 text-[0.92rem] [&>input]:size-4 [&>input]:accent-brand-600";
const H3 = "mb-3 text-[0.95rem]";

export interface Filters {
  category: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
}

interface Props {
  categories: Category[];
  filters: Filters;
  onChange: (patch: Partial<Record<keyof Filters, string | null>>) => void;
  onClear: () => void;
  hasActive: boolean;
}

export function FilterPanel({ categories, filters, onChange, onClear, hasActive }: Props) {
  const [min, setMin] = useState(filters.minPrice);
  const [max, setMax] = useState(filters.maxPrice);

  useEffect(() => {
    setMin(filters.minPrice);
    setMax(filters.maxPrice);
  }, [filters.minPrice, filters.maxPrice]);

  const selected = Number(filters.category) || null;
  const openTop = categories.find((c) => c.id === selected || c.children.some((ch) => ch.id === selected));

  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    onChange({ minPrice: min || null, maxPrice: max || null });
  };

  return (
    <div className="card grid gap-6 p-5">
      <div>
        <h3 className={H3}>Category</h3>
        <ul className="m-0 grid list-none gap-0.5 p-0">
          <li>
            <button type="button" className={ITEM} aria-current={!selected} onClick={() => onChange({ category: null })}>
              All categories
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button type="button" className={ITEM} aria-current={c.id === selected} onClick={() => onChange({ category: String(c.id) })}>
                {c.name}
              </button>
              {openTop?.id === c.id && c.children.length > 0 && (
                <ul className="m-0 mt-0.5 mb-1 ml-3.5 grid list-none border-l-2 border-line p-0 pl-2">
                  {c.children.map((ch) => (
                    <li key={ch.id}>
                      <button type="button" className={ITEM} aria-current={ch.id === selected} onClick={() => onChange({ category: String(ch.id) })}>
                        {ch.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className={H3}>Condition</h3>
        <label className={RADIO}>
          <input type="radio" name="condition" checked={!filters.condition} onChange={() => onChange({ condition: null })} />
          Any
        </label>
        {Object.entries(CONDITION_LABEL).map(([value, label]) => (
          <label key={value} className={RADIO}>
            <input type="radio" name="condition" checked={filters.condition === value} onChange={() => onChange({ condition: value })} />
            {label}
          </label>
        ))}
      </div>

      <form onSubmit={applyPrice}>
        <h3 className={H3}>Price</h3>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 [&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-md [&_input]:border-0 [&_input]:bg-surface-inset [&_input]:px-3 [&_input]:shadow-[var(--clay-pressed)] [&_input]:outline-none [&_input:focus]:shadow-[var(--clay-pressed),0_0_0_3px_rgb(229_137_99/0.5)]">
          <input type="number" inputMode="decimal" min="0" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Minimum price" />
          <span aria-hidden>to</span>
          <input type="number" inputMode="decimal" min="0" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} aria-label="Maximum price" />
        </div>
        <Button type="submit" size="sm" variant="clay" block icon={<Check size={16} aria-hidden />} style={{ marginTop: "0.8rem" }}>
          Apply
        </Button>
      </form>

      {hasActive && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}
