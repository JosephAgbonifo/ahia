"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export function Stars({ value, size = 16 }: { value: number | null; size?: number }) {
  const filled = Math.round(value ?? 0);
  return (
    <span style={{ display: "inline-flex", gap: 2, color: "#f0a020" }} role="img" aria-label={value ? `${value.toFixed(1)} out of 5` : "No ratings yet"}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} aria-hidden fill={n <= filled ? "currentColor" : "none"} style={{ opacity: n <= filled ? 1 : 0.4 }} />
      ))}
    </span>
  );
}

/** Interactive 1 to 5 star rating (radio group). */
export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label="Rating" className="inline-flex gap-1 text-[#f0a020]" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="grid size-10 place-items-center rounded-md hover:bg-brand-50"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Star size={26} aria-hidden fill={n <= shown ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}
