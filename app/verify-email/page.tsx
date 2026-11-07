"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Inbox, LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, StatusIcon } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { homeFor } from "@/lib/auth-redirect";

type State = "verifying" | "success" | "invalid" | "no-token";

// A verification link works once, so make sure we only ever send it once per token
// (React strict mode runs effects twice in development).
const attempts = new Map<string, Promise<void>>();
function verifyOnce(token: string) {
  if (!attempts.has(token)) attempts.set(token, api.post("/auth/verify-email", { token }).then(() => undefined));
  return attempts.get(token)!;
}

function VerifyContent() {
  const token = useSearchParams().get("token");
  const { user, status, refreshUser } = useAuth();
  const [state, setState] = useState<State>(token ? "verifying" : "no-token");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    verifyOnce(token)
      .then(async () => {
        await refreshUser(); // no-op when logged out
        if (active) setState("success");
      })
      .catch(() => active && setState("invalid"));
    return () => {
      active = false;
    };
  }, [token, refreshUser]);

  const resend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification");
      toast.success("New verification email sent");
    } catch {
      toast.error("Couldn't send the email. Try again in a moment.");
    } finally {
      setResending(false);
    }
  };

  const continueHref = user ? homeFor(user) : "/login";

  if (state === "verifying") {
    return (
      <AuthShell title="Verifying your email" subtitle="Hold on, this takes a second.">
        <StatusIcon>
          <Loader2 className="spin" size={36} aria-hidden />
        </StatusIcon>
      </AuthShell>
    );
  }

  if (state === "success") {
    return (
      <AuthShell title="Email verified" subtitle="You can now check out, and apply to sell.">
        <StatusIcon tone="success">
          <CheckCircle2 size={40} aria-hidden />
        </StatusIcon>
        <ButtonLink href={continueHref} size="lg" block>
          {user ? "Go to your dashboard" : "Log in to continue"}
        </ButtonLink>
      </AuthShell>
    );
  }

  if (state === "invalid") {
    return (
      <AuthShell title="This link has expired" subtitle="Verification links work once and last 24 hours.">
        <StatusIcon tone="danger">
          <LinkIcon size={36} aria-hidden />
        </StatusIcon>
        {status === "authenticated" ? (
          <Button size="lg" block loading={resending} onClick={resend}>
            Send a new link
          </Button>
        ) : (
          <ButtonLink href="/login?next=/dashboard" size="lg" block>
            Log in to get a new link
          </ButtonLink>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Check your email" subtitle="Open the link we sent you to verify your address.">
      <StatusIcon>
        <Inbox size={38} aria-hidden />
      </StatusIcon>
      {status === "authenticated" ? (
        <Button variant="clay" size="lg" block loading={resending} onClick={resend}>
          Resend email
        </Button>
      ) : (
        <ButtonLink href="/login" variant="clay" size="lg" block>
          Log in
        </ButtonLink>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
