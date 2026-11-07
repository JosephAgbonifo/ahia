"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MailWarning } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";

const COOLDOWN = 60;

/** Shown under the header while a logged-in user has not verified their email. */
export function VerifyEmailBanner() {
  const { user, refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const show = !!user && !user.email_verified_at;

  const resend = async () => {
    setSending(true);
    try {
      await api.post("/auth/resend-verification");
      toast.success(`Verification email sent to ${user?.email}`);
      setCooldown(COOLDOWN);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_VERIFIED") await refreshUser();
      else toast.error("Couldn't send the email. Try again in a moment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="container"
          style={{ marginTop: "1rem" }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="alert alert-warning" role="status" style={{ alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
            <span style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
              <MailWarning size={20} aria-hidden />
              <span>
                <strong>Verify your email</strong> to check out and start selling. We sent a link to {user?.email}.
              </span>
            </span>
            <Button size="sm" variant="clay" loading={sending} disabled={cooldown > 0} onClick={resend}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
