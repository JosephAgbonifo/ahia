"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Mail, MailCheck, Send } from "lucide-react";
import { AuthShell, StatusIcon } from "@/components/auth/AuthShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { handleFormError } from "@/lib/forms";
import { forgotSchema, type ForgotValues } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSentTo(email);
    } catch (err) {
      setFormError(handleFormError(err, setError, ["email"]));
    }
  });

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox" subtitle="If that email is registered, a reset link is on its way. It works for 1 hour.">
        <StatusIcon>
          <MailCheck size={38} aria-hidden />
        </StatusIcon>
        <p className="text-muted" style={{ textAlign: "center" }}>
          We sent it to <strong style={{ color: "var(--ink)" }}>{sentTo}</strong>.
        </p>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <Button variant="clay" block onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
          <ButtonLink href="/login" variant="ghost" block icon={<ArrowLeft size={18} aria-hidden />}>
            Back to log in
          </ButtonLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={<Link href="/login">Back to log in</Link>}
    >
      <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: "1.1rem" }}>
        {formError && (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={18} aria-hidden />
            <span>{formError}</span>
          </div>
        )}
        <TextField label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@university.edu" error={errors.email?.message} {...register("email")} />
        <Button type="submit" size="lg" block loading={isSubmitting} icon={<Send size={18} aria-hidden />}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
