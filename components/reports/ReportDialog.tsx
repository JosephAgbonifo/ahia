"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import { REPORT_REASONS } from "@/lib/admin";

interface Props {
  open: boolean;
  targetType: "product" | "user" | "message";
  targetId: number;
  subject: string;
  onClose: () => void;
}

/** Lets any logged-in user flag a listing or person for the admin team. */
export function ReportDialog({ open, targetType, targetId, subject, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setDetails("");
    }
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/reports", { targetType, targetId, reason, ...(details.trim() ? { details: details.trim() } : {}) });
      toast.success("Thanks. Our team will take a look.");
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't send your report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Report ${subject}`}>
      <p className="mb-4 text-ink-soft">What&apos;s wrong? Reports go to the Ahia team and the other person isn&apos;t told who reported them.</p>
      <fieldset className="mb-4 grid gap-2 border-0 p-0">
        <legend className="label mb-1.5">Reason</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="clay-inset flex cursor-pointer items-center gap-3 px-3.5 py-3 text-[0.93rem] [&>input]:accent-brand-600">
            <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} />
            {r}
          </label>
        ))}
      </fieldset>
      <label className="label" htmlFor="report-details">More details <span className="label-optional">(optional)</span></label>
      <div className="input-wrap mt-1.5 items-stretch">
        <textarea id="report-details" className="input-el min-h-24 resize-y" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button loading={busy} disabled={!reason} onClick={submit}>Send report</Button>
      </div>
    </Modal>
  );
}
