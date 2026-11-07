"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, FileText, ImagePlus, X } from "lucide-react";
import { cx } from "@/lib/cx";

export const MAX_BYTES = 5 * 1024 * 1024;

/** Checks type and size the way the API does. Returns an error message or null. */
export function checkFile(file: File, allowPdf: boolean): string | null {
  const ok = ["image/jpeg", "image/png", "image/webp", ...(allowPdf ? ["application/pdf"] : [])];
  if (!ok.includes(file.type)) return allowPdf ? "Use a JPG, PNG, WebP or PDF file" : "Use a JPG, PNG or WebP image";
  if (file.size > MAX_BYTES) return "File is too large (max 5 MB)";
  return null;
}

interface Props {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  allowPdf?: boolean;
  optional?: boolean;
  error?: string;
}

/** Single-file picker with drag and drop and an image preview. */
export function FileDrop({ label, hint, file, onChange, allowPdf = false, optional, error }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const problem = checkFile(f, allowPdf);
    setLocalError(problem);
    if (!problem) onChange(f);
  };

  const shownError = error ?? localError;
  const accept = allowPdf ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp";

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {optional && <span className="label-optional"> (optional)</span>}
      </label>

      {file ? (
        <div className="clay-inset flex items-center gap-4 p-3">
          <div className="grid size-16 flex-none place-items-center overflow-hidden rounded-md bg-surface text-ink-faint">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              <FileText size={26} aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate font-semibold">{file.name}</p>
            <p className="m-0 text-[0.85rem] text-ink-soft">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button type="button" className="icon-btn size-10!" onClick={() => { onChange(null); setLocalError(null); if (inputRef.current) inputRef.current.value = ""; }} aria-label={`Remove ${file.name}`}>
            <X size={18} aria-hidden />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cx(
            "clay-inset grid cursor-pointer justify-items-center gap-2 border-2 border-dashed px-4 py-8 text-center transition",
            over ? "border-brand-500 bg-brand-50" : "border-transparent hover:border-brand-300"
          )}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
        >
          <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600"><ImagePlus size={22} aria-hidden /></span>
          <span className="font-semibold">Drop a file here or <span className="text-brand-700 underline">browse</span></span>
          <span className="text-[0.82rem] text-ink-soft">{hint ?? (allowPdf ? "JPG, PNG, WebP or PDF, up to 5 MB" : "JPG, PNG or WebP, up to 5 MB")}</span>
        </label>
      )}

      <input ref={inputRef} id={id} type="file" accept={accept} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />

      {shownError && (
        <p className="field-error" role="alert">
          <AlertCircle size={14} aria-hidden />
          {shownError}
        </p>
      )}
    </div>
  );
}
