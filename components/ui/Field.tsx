"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronDown, Eye, EyeOff, type LucideIcon } from "lucide-react";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  icon?: LucideIcon;
}

function Shell({
  id,
  label,
  error,
  hint,
  optional,
  children,
}: Pick<FieldProps, "label" | "error" | "hint" | "optional"> & { id: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {optional && <span className="label-optional"> (optional)</span>}
      </label>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={`${id}-error`}
            role="alert"
            className="field-error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={14} aria-hidden />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" id={`${id}-hint`} className="field-hint" exit={{ opacity: 0 }}>
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export const TextField = forwardRef<
  HTMLInputElement,
  FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & { id?: string }
>(function TextField({ label, error, hint, optional, icon: Icon, type = "text", id, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <Shell id={fieldId} label={label} error={error} hint={hint} optional={optional}>
      <div
        className="input-wrap"
        data-invalid={!!error}
        data-icon={!!Icon}
        data-action={isPassword}
      >
        {Icon && <Icon className="input-icon" size={18} aria-hidden />}
        <input
          ref={ref}
          id={fieldId}
          className="input-el"
          type={isPassword && show ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={describedBy(fieldId, error, hint)}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="input-action"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        )}
      </div>
    </Shell>
  );
});

export const SelectField = forwardRef<
  HTMLSelectElement,
  FieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & { id?: string }
>(function SelectField({ label, error, hint, optional, icon: Icon, id, children, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;

  return (
    <Shell id={fieldId} label={label} error={error} hint={hint} optional={optional}>
      <div className="input-wrap" data-invalid={!!error} data-icon={!!Icon}>
        {Icon && <Icon className="input-icon" size={18} aria-hidden />}
        <select
          ref={ref}
          id={fieldId}
          className="input-el"
          aria-invalid={!!error}
          aria-describedby={describedBy(fieldId, error, hint)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          aria-hidden
          style={{ position: "absolute", right: "1rem", pointerEvents: "none", color: "var(--ink-faint)" }}
        />
      </div>
    </Shell>
  );
});

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  FieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & { id?: string; count?: number; limit?: number }
>(function TextAreaField({ label, error, hint, optional, id, count, limit, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Shell id={fieldId} label={label} error={error} hint={hint} optional={optional}>
      <div className="input-wrap items-stretch" data-invalid={!!error}>
        <textarea
          ref={ref}
          id={fieldId}
          className="input-el min-h-36 resize-y"
          aria-invalid={!!error}
          aria-describedby={describedBy(fieldId, error, hint)}
          {...rest}
        />
      </div>
      {limit !== undefined && count !== undefined && (
        <span className={`justify-self-end text-[0.8rem] ${count > limit ? "font-bold text-danger" : "text-ink-faint"}`}>
          {count.toLocaleString()} / {limit.toLocaleString()}
        </span>
      )}
    </Shell>
  );
});
