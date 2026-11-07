"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronRight, Eye, EyeOff, FileWarning, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/shop";
import { useApi } from "@/lib/useApi";

interface Detail {
  id: number;
  userId: number;
  email: string;
  displayName: string;
  idType: string;
  idNumber: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  hasSelfie: boolean;
  submittedAt: string;
  reviewedAt: string | null;
}

const ID_LABEL: Record<string, string> = {
  national_id: "National ID",
  passport: "Passport",
  drivers_license: "Driver's licence",
  student_id: "Student ID",
  voters_card: "Voter's card",
};

/** Loads a private document with the admin's token and shows it (image or PDF). */
function Document({ path, label }: { path: string; label: string }) {
  const [state, setState] = useState<{ url: string; type: string } | "error" | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    api
      .blob(path)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setState({ url, type: blob.type });
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  return (
    <figure className="m-0 grid gap-2">
      <figcaption className="text-[0.9rem] font-bold">{label}</figcaption>
      <div className="clay-inset grid min-h-64 place-items-center overflow-hidden p-2">
        {state === null ? (
          <div className="skeleton h-60 w-full" aria-label={`Loading ${label}`} />
        ) : state === "error" ? (
          <div className="grid justify-items-center gap-2 p-6 text-center text-ink-soft"><FileWarning size={28} aria-hidden />Couldn&apos;t load this file</div>
        ) : state.type === "application/pdf" ? (
          <iframe src={state.url} title={label} className="h-[32rem] w-full rounded-md border-0" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={state.url} alt={label} className="max-h-[32rem] w-full rounded-md object-contain" />
        )}
      </div>
    </figure>
  );
}

function Review() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, reload } = useApi<{ submission: Detail }>(`/admin/kyc/${id}`);
  const [reveal, setReveal] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <div className="skeleton h-96 rounded-lg" />;

  const sub = data?.submission;
  if (error || !sub) {
    return <EmptyState icon={<FileWarning size={32} aria-hidden />} title="We couldn't load this submission" action={<Button onClick={reload}>Try again</Button>} />;
  }

  const act = async (kind: "approve" | "reject") => {
    setBusy(true);
    try {
      await api.post(`/admin/kyc/${sub.id}/${kind}`, kind === "reject" ? { reason: reason.trim() } : undefined);
      toast.success(kind === "approve" ? "ID approved. The user has been notified." : "ID rejected. The user can resubmit.");
      router.push("/admin/kyc");
    } catch (e) {
      if (e instanceof ApiError && e.code === "KYC_ALREADY_REVIEWED") {
        toast.info("Someone already reviewed this submission.");
        setApproveOpen(false);
        setRejectOpen(false);
        reload();
      } else {
        toast.error(e instanceof ApiError ? e.message : "Something went wrong");
      }
      setBusy(false);
    }
  };

  const reasonValid = reason.trim().length >= 3 && reason.trim().length <= 500;
  const masked = sub.idNumber.length > 4 ? `${"•".repeat(sub.idNumber.length - 4)}${sub.idNumber.slice(-4)}` : "••••";
  const pending = sub.status === "pending";

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link><ChevronRight size={14} aria-hidden />
        <Link href="/admin/kyc" className="text-ink-soft">ID verifications</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">{sub.displayName}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1">{sub.displayName}</h1>
          <p className="m-0 text-ink-soft">{sub.email}</p>
        </div>
        <span className={`badge ${sub.status === "approved" ? "badge-success" : sub.status === "rejected" ? "badge-danger" : "badge-warning"}`}>{sub.status[0].toUpperCase() + sub.status.slice(1)}</span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="card grid gap-6 p-5 sm:p-8" aria-label="Documents">
          <Document path={`/admin/kyc/${sub.id}/file/id`} label="ID document" />
          {sub.hasSelfie && <Document path={`/admin/kyc/${sub.id}/file/selfie`} label="Selfie" />}
          {!sub.hasSelfie && <p className="m-0 text-[0.9rem] text-ink-soft">No selfie was uploaded.</p>}
        </section>

        <aside className="card grid gap-5 p-5 sm:p-6 lg:sticky lg:top-36" aria-label="Details and decision">
          <dl className="m-0 grid gap-3.5 text-[0.92rem]">
            <div><dt className="text-ink-faint">ID type</dt><dd className="m-0 font-semibold">{ID_LABEL[sub.idType] ?? sub.idType}</dd></div>
            <div>
              <dt className="text-ink-faint">ID number</dt>
              <dd className="m-0 flex items-center gap-2 font-semibold">
                <code className="font-mono tracking-wide">{reveal ? sub.idNumber : masked}</code>
                <button type="button" className="icon-btn size-8!" onClick={() => setReveal((r) => !r)} aria-label={reveal ? "Hide ID number" : "Show ID number"} aria-pressed={reveal}>
                  {reveal ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                </button>
              </dd>
            </div>
            <div><dt className="text-ink-faint">Submitted</dt><dd className="m-0 font-semibold">{formatDate(sub.submittedAt)}</dd></div>
            {sub.reviewedAt && <div><dt className="text-ink-faint">Reviewed</dt><dd className="m-0 font-semibold">{formatDate(sub.reviewedAt)}</dd></div>}
            {sub.rejectionReason && <div><dt className="text-ink-faint">Rejection reason</dt><dd className="m-0 font-semibold">{sub.rejectionReason}</dd></div>}
          </dl>

          <div className="alert alert-info text-[0.85rem]"><AlertCircle size={16} aria-hidden /><span>Viewing this submission is recorded in the audit log.</span></div>

          {pending ? (
            <div className="grid gap-3">
              <Button size="lg" block onClick={() => setApproveOpen(true)} icon={<CheckCircle2 size={18} aria-hidden />}>Approve</Button>
              <Button size="lg" variant="clay" block onClick={() => setRejectOpen(true)} icon={<XCircle size={18} aria-hidden />}>Reject</Button>
            </div>
          ) : (
            <p className="m-0 text-[0.9rem] text-ink-soft">This submission has already been reviewed.</p>
          )}
        </aside>
      </div>

      <ConfirmDialog open={approveOpen} title="Approve this ID?" text={`${sub.displayName} will be able to list items and add payout accounts. They'll be notified right away.`} confirmLabel="Approve" loading={busy} onConfirm={() => act("approve")} onClose={() => setApproveOpen(false)} />

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject this ID?">
        <p className="mb-4 text-ink-soft">Tell {sub.displayName} what to fix. They&apos;ll see this message and can submit again.</p>
        <label className="label" htmlFor="reason">Reason</label>
        <div className="input-wrap mt-1.5 items-stretch">
          <textarea id="reason" className="input-el min-h-28 resize-y" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The photo is blurry. Please upload a clear photo with all four corners visible." />
        </div>
        <p className="mt-1.5 mb-5 text-right text-[0.8rem] text-ink-faint">{reason.trim().length} / 500 (at least 3)</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="danger" loading={busy} disabled={!reasonValid} onClick={() => act("reject")}>Reject ID</Button>
        </div>
      </Modal>
    </>
  );
}

export default function AdminKycReviewPage() {
  return (
    <RequireAuth role="admin">
      <Review />
    </RequireAuth>
  );
}
