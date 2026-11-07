"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, BadgeCheck, Clock, CreditCard, Lock, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { useAuth } from "@/components/auth/AuthProvider";
import { StatusIcon } from "@/components/auth/AuthShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { SelectField, TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/shop";
import { useApi } from "@/lib/useApi";
import { handleFormError } from "@/lib/forms";
import { ID_TYPES, kycSchema, type KycValues } from "@/lib/validation";

interface KycStatus {
  kycStatus: "none" | "pending" | "approved" | "rejected";
  latestSubmission: { id: number; id_type: string; status: string; rejection_reason: string | null; submitted_at: string; reviewed_at: string | null } | null;
}

const WHY = [
  { icon: ShieldCheck, title: "Keeps buyers safe", text: "Only real students and verified people can sell." },
  { icon: Lock, title: "Stored privately", text: "Your ID is encrypted and only seen by our review team." },
  { icon: CreditCard, title: "Needed for payouts", text: "You can't withdraw earnings without it." },
];

function KycForm({ rejectionReason, onSubmitted }: { rejectionReason?: string | null; onSubmitted: () => void }) {
  const { refreshUser } = useAuth();
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [formError, setFormError] = useState("");

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<KycValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: { idType: "", idNumber: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    if (!idFile) return setFileError("Upload a clear photo or scan of your ID");
    setFileError("");

    const form = new FormData();
    form.append("idType", values.idType);
    form.append("idNumber", values.idNumber);
    form.append("idFile", idFile);
    if (selfie) form.append("selfie", selfie);

    try {
      await api.upload("/kyc", form);
      toast.success("Submitted. We'll review it shortly.");
      await refreshUser();
      onSubmitted();
    } catch (err) {
      if (err instanceof ApiError && (err.code === "KYC_PENDING" || err.code === "KYC_ALREADY_APPROVED")) {
        await refreshUser();
        onSubmitted();
        return;
      }
      setFormError(handleFormError(err, setError, ["idType", "idNumber"]));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {rejectionReason && (
        <div className="alert alert-danger" role="alert">
          <ShieldAlert size={18} aria-hidden />
          <span><strong>Your last submission was rejected:</strong> {rejectionReason}</span>
        </div>
      )}
      {formError && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle size={18} aria-hidden />
          <span>{formError}</span>
        </div>
      )}

      <div className="form-grid-2">
        <SelectField label="ID type" icon={CreditCard} error={errors.idType?.message} {...register("idType")}>
          <option value="">Choose one</option>
          {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </SelectField>
        <TextField label="ID number" autoComplete="off" error={errors.idNumber?.message} hint="Encrypted when stored" {...register("idNumber")} />
      </div>

      <FileDrop label="Photo or scan of your ID" file={idFile} onChange={(f) => { setIdFile(f); setFileError(""); }} allowPdf error={fileError} hint="All four corners visible and the text readable. JPG, PNG, WebP or PDF, up to 5 MB" />
      <FileDrop label="Selfie holding your ID" optional file={selfie} onChange={setSelfie} hint="Speeds up review. JPG, PNG or WebP, up to 5 MB" />

      <Button type="submit" size="lg" block loading={isSubmitting} icon={<Upload size={18} aria-hidden />}>
        Submit for review
      </Button>
    </form>
  );
}

function KycContent() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<KycStatus>("/kyc/status");
  if (!user) return null;

  const status = data?.kycStatus ?? user.kyc_status;
  const last = data?.latestSubmission;

  let body: React.ReactNode;
  if (loading && !data) {
    body = <div className="skeleton h-72 rounded-lg" />;
  } else if (error && !data) {
    body = (
      <div className="alert alert-danger" role="alert">
        <AlertCircle size={18} aria-hidden />
        <div className="grid gap-2"><span>We couldn&apos;t load your verification status.</span><Button size="sm" variant="clay" onClick={reload}>Try again</Button></div>
      </div>
    );
  } else if (!user.email_verified_at) {
    body = (
      <div className="alert alert-warning" role="status">
        <AlertCircle size={18} aria-hidden />
        <span>Verify your email first. Use the banner at the top of the page to resend the link, then come back here.</span>
      </div>
    );
  } else if (status === "approved") {
    body = (
      <div className="py-4 text-center">
        <StatusIcon tone="success"><BadgeCheck size={40} aria-hidden /></StatusIcon>
        <h2 className="text-2xl">You&apos;re a verified seller</h2>
        <p className="mb-6 text-ink-soft">{last?.reviewed_at ? `Approved on ${formatDate(last.reviewed_at)}.` : "Your ID has been approved."} You can now list items and add a payout account.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/sell/new" size="lg">Create a listing</ButtonLink>
          <ButtonLink href="/payouts" variant="clay" size="lg">Add payout account</ButtonLink>
        </div>
      </div>
    );
  } else if (status === "pending") {
    body = (
      <div className="py-4 text-center">
        <StatusIcon><Clock size={38} aria-hidden /></StatusIcon>
        <h2 className="text-2xl">Your ID is under review</h2>
        <p className="mb-6 text-ink-soft">{last ? `Submitted on ${formatDate(last.submitted_at)}. ` : ""}Reviews usually take a short while. We&apos;ll send you a notification when it&apos;s done.</p>
        <Button variant="clay" size="lg" onClick={reload}>Check status</Button>
      </div>
    );
  } else {
    body = <KycForm rejectionReason={status === "rejected" ? last?.rejection_reason ?? "No reason was given." : null} onSubmitted={reload} />;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[minmax(0,1fr)_19rem] md:items-start">
      <section className="card p-6 sm:p-8" aria-labelledby="kyc-h">
        <h1 id="kyc-h" className="mb-1 text-[clamp(1.5rem,3vw,2rem)]">Verify your ID</h1>
        <p className="mb-6 text-ink-soft">One quick check so you can sell on Ahia.</p>
        {body}
      </section>

      <aside className="card grid gap-5 p-6" aria-label="Why we verify">
        <h2 className="m-0 text-lg">Why we ask</h2>
        {WHY.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3.5">
            <span className="grid size-10 flex-none place-items-center rounded-full bg-brand-50 text-brand-700"><Icon size={20} aria-hidden /></span>
            <div><strong className="block font-heading text-[0.95rem]">{title}</strong><span className="text-[0.88rem] text-ink-soft">{text}</span></div>
          </div>
        ))}
      </aside>
    </div>
  );
}

export default function KycPage() {
  return (
    <RequireAuth>
      <KycContent />
    </RequireAuth>
  );
}
