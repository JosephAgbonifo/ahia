"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, KeyRound, Lock, LinkIcon } from "lucide-react";
import { AuthShell, StatusIcon } from "@/components/auth/AuthShell";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { handleFormError } from "@/lib/forms";
import { resetSchema, type ResetValues } from "@/lib/validation";

function ResetForm() {
  const token = useSearchParams().get("token");
  const [done, setDone] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(!token);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: "" } });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password updated");
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "LINK_INVALID") setLinkInvalid(true);
      else setFormError(handleFormError(err, setError, ["password"]));
    }
  });

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You've been logged out everywhere. Log in with your new password.">
        <StatusIcon tone="success">
          <CheckCircle2 size={40} aria-hidden />
        </StatusIcon>
        <ButtonLink href="/login" size="lg" block>
          Go to log in
        </ButtonLink>
      </AuthShell>
    );
  }

  if (linkInvalid) {
    return (
      <AuthShell title="This link has expired" subtitle="Reset links work once and last 1 hour.">
        <StatusIcon tone="danger">
          <LinkIcon size={36} aria-hidden />
        </StatusIcon>
        <ButtonLink href="/forgot-password" size="lg" block>
          Get a new link
        </ButtonLink>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you don't use anywhere else."
      footer={<Link href="/login">Back to log in</Link>}
    >
      <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: "1.1rem" }}>
        {formError && (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={18} aria-hidden />
            <span>{formError}</span>
          </div>
        )}
        <TextField label="New password" type="password" icon={Lock} autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        <PasswordStrength value={watch("password")} />
        <Button type="submit" size="lg" block loading={isSubmitting} icon={<KeyRound size={18} aria-hidden />}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
