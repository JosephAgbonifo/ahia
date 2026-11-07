"use client";

import { useState, type ReactNode } from "react";
import { Clock, MailWarning, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { StatusIcon } from "@/components/auth/AuthShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api } from "@/lib/api";

/** Only lets verified sellers (verified email and approved ID) through. */
export function SellerGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  if (!user) return null;

  const resend = async () => {
    setSending(true);
    try {
      await api.post("/auth/resend-verification");
      toast.success(`Verification email sent to ${user.email}`);
    } catch {
      toast.error("Couldn't send the email. Try again in a moment.");
    } finally {
      setSending(false);
    }
  };

  let content: { icon: ReactNode; tone: "brand" | "danger"; title: string; text: string; action: ReactNode } | null = null;

  if (!user.email_verified_at) {
    content = {
      icon: <MailWarning size={38} aria-hidden />,
      tone: "brand",
      title: "Verify your email first",
      text: `We sent a link to ${user.email}. Open it, then come back here to continue.`,
      action: <Button size="lg" loading={sending} onClick={resend}>Resend email</Button>,
    };
  } else if (user.kyc_status === "pending") {
    content = {
      icon: <Clock size={38} aria-hidden />,
      tone: "brand",
      title: "Your ID is under review",
      text: "We'll notify you as soon as it's approved. You can start listing right after.",
      action: <ButtonLink href="/kyc" variant="clay" size="lg">View status</ButtonLink>,
    };
  } else if (user.kyc_status !== "approved") {
    const rejected = user.kyc_status === "rejected";
    content = {
      icon: rejected ? <ShieldAlert size={38} aria-hidden /> : <ShieldCheck size={38} aria-hidden />,
      tone: rejected ? "danger" : "brand",
      title: rejected ? "Your ID verification was rejected" : "Verify your ID to start selling",
      text: rejected ? "Check the reason and submit a clearer photo." : "Buyers trust verified sellers. It takes about two minutes.",
      action: <ButtonLink href="/kyc" size="lg">{rejected ? "See why and resubmit" : "Verify my ID"}</ButtonLink>,
    };
  }

  if (!content) return <>{children}</>;

  return (
    <div className="card mx-auto my-8 max-w-lg px-6 py-12 text-center sm:px-10">
      <StatusIcon tone={content.tone}>{content.icon}</StatusIcon>
      <h1 className="text-2xl">{content.title}</h1>
      <p className="mb-6 text-ink-soft">{content.text}</p>
      {content.action}
    </div>
  );
}
