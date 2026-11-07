"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Coins, Hash, Landmark, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { handleFormError } from "@/lib/forms";
import { cx } from "@/lib/cx";
import { bankAccountSchema, xrpAccountSchema, type BankAccountValues, type XrpAccountValues } from "@/lib/validation";

type Kind = "bank" | "xrp";

function BankForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<BankAccountValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: { bankName: "", bankCode: "", accountNumber: "", accountName: "" },
  });

  const submit = handleSubmit(async (v) => {
    setFormError("");
    try {
      await api.post("/payouts/accounts", { type: "bank", bankName: v.bankName, accountNumber: v.accountNumber, accountName: v.accountName, ...(v.bankCode ? { bankCode: v.bankCode } : {}) });
      toast.success("Bank account added");
      onDone();
    } catch (e) {
      setFormError(handleFormError(e, setError, ["bankName", "bankCode", "accountNumber", "accountName"]));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {formError && <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><span>{formError}</span></div>}
      <TextField label="Bank name" icon={Landmark} placeholder="e.g. GTBank" error={errors.bankName?.message} {...register("bankName")} />
      <div className="form-grid-2">
        <TextField label="Account number" inputMode="numeric" autoComplete="off" error={errors.accountNumber?.message} {...register("accountNumber")} />
        <TextField label="Bank code" optional error={errors.bankCode?.message} {...register("bankCode")} />
      </div>
      <TextField label="Name on the account" icon={User} error={errors.accountName?.message} hint="Must match your verified ID name, or the payout may fail" {...register("accountName")} />
      <div className="mt-1 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Add bank account</Button>
      </div>
    </form>
  );
}

function XrpForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<XrpAccountValues>({
    resolver: zodResolver(xrpAccountSchema),
    defaultValues: { address: "", destinationTag: "" },
  });

  const submit = handleSubmit(async (v) => {
    setFormError("");
    try {
      await api.post("/payouts/accounts", { type: "xrp", address: v.address, ...(v.destinationTag ? { destinationTag: Number(v.destinationTag) } : {}) });
      toast.success("XRPL address added");
      onDone();
    } catch (e) {
      setFormError(handleFormError(e, setError, ["address", "destinationTag"]));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {formError && <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><span>{formError}</span></div>}
      <p className="clay-inset m-0 px-4 py-3 text-[0.88rem] text-ink-soft">Payouts are sent in <strong>RLUSD</strong>. This address must have a <strong>trust line</strong> to the RLUSD issuer, or the payout will fail. Set it up in your wallet before you withdraw.</p>
      <TextField label="XRPL address" icon={Wallet} placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" autoComplete="off" spellCheck={false} error={errors.address?.message} {...register("address")} />
      <TextField label="Destination tag" optional icon={Hash} inputMode="numeric" hint="Only if your exchange or wallet needs one" error={errors.destinationTag?.message} {...register("destinationTag")} />
      <div className="mt-1 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Add XRPL address</Button>
      </div>
    </form>
  );
}

interface Props {
  open: boolean;
  initialKind?: Kind;
  campusCurrency: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddAccountModal({ open, initialKind = "bank", campusCurrency, onClose, onAdded }: Props) {
  const [kind, setKind] = useState<Kind>(initialKind);
  useEffect(() => {
    if (open) setKind(initialKind);
  }, [open, initialKind]);

  const done = () => {
    onClose();
    onAdded();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a payout account">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-surface-inset p-1.5 shadow-[var(--clay-pressed)]" role="tablist" aria-label="Account type">
        {([["bank", "Bank account", Landmark, campusCurrency], ["xrp", "XRPL address", Coins, "RLUSD"]] as const).map(([k, label, Icon, cur]) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={cx("flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[0.9rem] font-bold transition", kind === k ? "bg-surface text-ink shadow-[var(--clay-out-sm)]" : "text-ink-soft")}>
            <Icon size={16} aria-hidden />
            <span>{label}<span className="block text-[0.72rem] font-medium text-ink-faint">Paid in {cur}</span></span>
          </button>
        ))}
      </div>
      {kind === "bank" ? <BankForm onDone={done} onCancel={onClose} /> : <XrpForm onDone={done} onCancel={onClose} />}
    </Modal>
  );
}
