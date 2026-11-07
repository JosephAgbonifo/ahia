"use client";

import { cx } from "@/lib/cx";

interface Props {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

/** Pill tabs used to filter lists by status. */
export function Tabs({ tabs, value, onChange, label }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "rounded-full px-4 py-2 text-[0.9rem] font-bold transition",
            value === t.value ? "clay-brand" : "bg-surface text-ink-soft shadow-[var(--clay-out-sm)] hover:text-ink"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
