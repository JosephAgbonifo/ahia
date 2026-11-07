import { Check } from "lucide-react";
import { cx } from "@/lib/cx";
import type { SellerOrder } from "@/lib/orders";
import { formatDate } from "@/lib/shop";

/** Paid, shipped, delivered, completed. Shipping is optional, so it counts as done once delivered. */
export function OrderTimeline({ so, paidAt }: { so: SellerOrder; paidAt?: string | null }) {
  const paid = !["awaiting_payment", "cancelled"].includes(so.status);
  const steps = [
    { label: "Paid", done: paid, date: paidAt ?? null },
    { label: "Shipped", done: !!(so.shipped_at || so.delivered_at), date: so.shipped_at },
    { label: "Delivered", done: !!so.delivered_at, date: so.delivered_at },
    { label: "Completed", done: !!so.completed_at, date: so.completed_at },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <ol className="m-0 grid list-none grid-cols-4 gap-1 p-0" aria-label="Order progress">
      {steps.map((s, i) => (
        <li
          key={s.label}
          aria-current={i === current ? "step" : undefined}
          className={cx(
            "relative grid justify-items-center gap-1.5 text-center",
            i < steps.length - 1 && "after:absolute after:top-4 after:left-[calc(50%+1.25rem)] after:h-0.5 after:w-[calc(100%-2.5rem)] after:rounded-full",
            i < steps.length - 1 && (steps[i + 1].done ? "after:bg-success" : "after:bg-line")
          )}
        >
          <span
            className={cx(
              "grid size-8 place-items-center rounded-full text-[0.8rem] font-bold",
              s.done ? "bg-success text-white" : i === current ? "bg-brand-100 text-brand-800 ring-2 ring-brand-400" : "bg-surface-inset text-ink-faint"
            )}
          >
            {s.done ? <Check size={16} aria-hidden /> : i + 1}
          </span>
          <span className={cx("text-[0.82rem] font-semibold", s.done || i === current ? "text-ink" : "text-ink-faint")}>{s.label}</span>
          <span className="min-h-4 text-[0.74rem] text-ink-faint">{s.done && s.date ? formatDate(s.date) : ""}</span>
        </li>
      ))}
    </ol>
  );
}
