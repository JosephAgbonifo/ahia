"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, ImagePlus, Trash2 } from "lucide-react";
import { cx } from "@/lib/cx";
import { checkFile } from "@/components/ui/FileDrop";

export const MAX_IMAGES = 6;

interface Props {
  existing: { id: number; url: string }[];
  files: File[];
  onAdd: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onRemoveExisting: (id: number) => void;
  error?: string;
}

/** Up to 6 product photos. The first one is the cover. */
export function ImagePicker({ existing, files, onAdd, onRemoveFile, onRemoveExisting, error }: Props) {
  const id = useId();
  const [over, setOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach(URL.revokeObjectURL), [urls]);

  const total = existing.length + files.length;
  const room = MAX_IMAGES - total;

  const add = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const accepted: File[] = [];
    let problem: string | null = null;
    for (const f of incoming) {
      const p = checkFile(f, false);
      if (p) problem = `${f.name}: ${p}`;
      else accepted.push(f);
    }
    if (accepted.length > room) problem = `You can add ${room} more photo${room === 1 ? "" : "s"} (max ${MAX_IMAGES})`;
    setLocalError(problem);
    if (accepted.length) onAdd(accepted.slice(0, Math.max(room, 0)));
  };

  const shown = error ?? localError;
  const tile = "relative aspect-square overflow-hidden rounded-lg bg-surface-inset";

  return (
    <div className="field">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">Photos</span>
        <span className="text-[0.82rem] text-ink-soft">{total} of {MAX_IMAGES}. The first photo is the cover.</span>
      </div>

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4">
        {existing.map((img, i) => (
          <li key={`e${img.id}`} className={tile}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[0.72rem] font-bold">Cover</span>}
            <button type="button" className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/95 text-danger shadow" onClick={() => onRemoveExisting(img.id)} aria-label={`Delete photo ${i + 1}`}>
              <Trash2 size={15} aria-hidden />
            </button>
          </li>
        ))}
        {files.map((f, i) => (
          <li key={`n${i}-${f.name}`} className={tile}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[i]} alt={f.name} className="size-full object-cover" />
            {existing.length + i === 0 && <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[0.72rem] font-bold">Cover</span>}
            <span className="absolute bottom-2 left-2 rounded-full bg-brand-100 px-2 py-0.5 text-[0.7rem] font-bold text-brand-800">New</span>
            <button type="button" className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/95 text-danger shadow" onClick={() => onRemoveFile(i)} aria-label={`Remove ${f.name}`}>
              <Trash2 size={15} aria-hidden />
            </button>
          </li>
        ))}

        {room > 0 && (
          <li>
            <label
              htmlFor={id}
              className={cx(
                "clay-inset grid aspect-square cursor-pointer place-items-center content-center justify-items-center gap-1.5 border-2 border-dashed p-2 text-center text-[0.85rem] font-semibold transition",
                over ? "border-brand-500 bg-brand-50" : "border-transparent hover:border-brand-300"
              )}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
            >
              <ImagePlus size={24} className="text-brand-600" aria-hidden />
              Add photos
            </label>
          </li>
        )}
      </ul>

      <input id={id} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />

      {shown && (
        <p className="field-error" role="alert">
          <AlertCircle size={14} aria-hidden />
          {shown}
        </p>
      )}
    </div>
  );
}
