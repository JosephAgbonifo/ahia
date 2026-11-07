"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  danger?: boolean;
  multiline?: boolean;
  /** Minimum characters (0 = optional) */
  min?: number;
  max: number;
  loading?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

/** A dialog that asks for a short note or reference before an action. */
export function TextPromptModal({ open, title, description, label, placeholder, confirmLabel, danger, multiline, min = 0, max, loading, onConfirm, onClose }: Props) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  const trimmed = value.trim();
  const valid = trimmed.length >= min && trimmed.length <= max;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description && <p className="mb-4 text-ink-soft">{description}</p>}
      <label className="label" htmlFor="prompt-input">{label}{min === 0 && <span className="label-optional"> (optional)</span>}</label>
      <div className="input-wrap mt-1.5 items-stretch">
        {multiline ? (
          <textarea id="prompt-input" className="input-el min-h-28 resize-y" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />
        ) : (
          <input id="prompt-input" className="input-el" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />
        )}
      </div>
      {(multiline || min > 0) && <p className="mt-1.5 mb-0 text-right text-[0.8rem] text-ink-faint">{trimmed.length} / {max}{min > 0 ? ` (at least ${min})` : ""}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} loading={loading} disabled={!valid} onClick={() => onConfirm(trimmed)}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
