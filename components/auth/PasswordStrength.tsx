"use client";

import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";

const RULES = [
  { id: "len", label: "8 or more characters", test: (v: string) => v.length >= 8 },
  { id: "letter", label: "A letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { id: "number", label: "A number", test: (v: string) => /\d/.test(v) },
];

const COLORS = ["var(--danger)", "var(--danger)", "var(--warning)", "var(--success)"];

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const passed = RULES.filter((r) => r.test(value)).length;

  return (
    <div className="strength" aria-live="polite">
      <div className="strength-track" aria-hidden>
        <motion.div
          className="strength-fill"
          initial={false}
          animate={{ width: `${(passed / RULES.length) * 100}%`, backgroundColor: COLORS[passed] }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        />
      </div>
      <ul className="strength-rules">
        {RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.id} data-ok={ok}>
              {ok ? <Check size={14} aria-hidden /> : <Circle size={14} aria-hidden />}
              {r.label}
              <span className="sr-only">{ok ? " (met)" : " (not met)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
