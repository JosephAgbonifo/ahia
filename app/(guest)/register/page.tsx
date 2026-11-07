"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, GraduationCap, Lock, Mail, Phone, RefreshCw, User, UserPlus } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { api, ApiError, type University } from "@/lib/api";
import { safeNext } from "@/lib/auth-redirect";
import { handleFormError } from "@/lib/forms";
import { registerSchema, type RegisterValues } from "@/lib/validation";

const STEPS = ["Your account", "Your campus"];
const ACCOUNT_FIELDS = ["firstName", "lastName", "email", "password"] as const;

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
};

function RegisterForm() {
  const { register: signUp } = useAuth();
  const next = safeNext(useSearchParams().get("next"));

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [formError, setFormError] = useState("");
  const [universities, setUniversities] = useState<University[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", universityId: "", phone: "" },
  });

  const loadUniversities = useCallback(() => {
    setLoadFailed(false);
    api
      .get<{ universities: University[] }>("/universities")
      .then((d) => setUniversities(d.universities))
      .catch(() => setLoadFailed(true));
  }, []);
  useEffect(loadUniversities, [loadUniversities]);

  const grouped = useMemo(() => {
    const map = new Map<string, University[]>();
    universities?.forEach((u) => map.set(u.country_name, [...(map.get(u.country_name) ?? []), u]));
    return [...map.entries()];
  }, [universities]);

  const goTo = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const goNext = async () => {
    if (await trigger([...ACCOUNT_FIELDS])) goTo(1);
  };

  const submit = handleSubmit(async (values) => {
    setFormError("");
    const phone = values.phone?.replace(/[\s\-()]/g, "");
    try {
      const user = await signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        universityId: Number(values.universityId),
        ...(phone ? { phone } : {}),
      });
      toast.success(`Welcome to Ahia, ${user.first_name}`);
      // GuestOnly sends them to the dashboard, where the verify-email banner is waiting
    } catch (err) {
      setFormError(
        handleFormError(err, setError, [...ACCOUNT_FIELDS, "universityId", "phone"])
      );
      // If the problem belongs to step 1 (e.g. email taken), go back to it
      if (err instanceof ApiError && (err.code === "EMAIL_TAKEN" || ACCOUNT_FIELDS.some((f) => err.fieldErrors[f]))) {
        goTo(0);
      }
    }
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle={step === 0 ? "Start with the basics. It takes about a minute." : "Pick your university so you see items on your campus."}
      footer={
        <>
          Already have an account?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Log in</Link>
        </>
      }
    >
      {/* Progress */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }} aria-hidden>
          {STEPS.map((_, i) => (
            <div key={i} className="strength-track" style={{ flex: 1 }}>
              <motion.div
                className="strength-fill"
                style={{ background: "var(--brand-500)" }}
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 200, damping: 24 }}
              />
            </div>
          ))}
        </div>
        <p className="text-muted" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", fontWeight: 600 }}>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          if (step === 0) {
            e.preventDefault();
            void goNext();
          } else {
            void submit(e);
          }
        }}
      >
        {formError && (
          <div className="alert alert-danger" role="alert" style={{ marginBottom: "1rem" }}>
            <AlertCircle size={18} aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ display: "grid", gap: "1.1rem" }}
          >
            {step === 0 ? (
              <>
                <div className="form-grid-2">
                  <TextField label="First name" icon={User} autoComplete="given-name" error={errors.firstName?.message} {...register("firstName")} />
                  <TextField label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register("lastName")} />
                </div>
                <TextField label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@university.edu" error={errors.email?.message} {...register("email")} />
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <TextField label="Password" type="password" icon={Lock} autoComplete="new-password" error={errors.password?.message} {...register("password")} />
                  <PasswordStrength value={watch("password")} />
                </div>
                <Button type="submit" size="lg" block>
                  Continue
                </Button>
              </>
            ) : (
              <>
                {loadFailed ? (
                  <div className="alert alert-danger" role="alert">
                    <AlertCircle size={18} aria-hidden />
                    <div style={{ display: "grid", gap: "0.6rem" }}>
                      <span>We couldn&apos;t load the university list.</span>
                      <Button size="sm" variant="clay" onClick={loadUniversities} icon={<RefreshCw size={14} aria-hidden />}>
                        Try again
                      </Button>
                    </div>
                  </div>
                ) : !universities ? (
                  <div className="skeleton" style={{ height: "5rem" }} aria-label="Loading universities" />
                ) : (
                  <SelectField
                    label="University"
                    icon={GraduationCap}
                    hint="Your campus decides which items you see and your currency."
                    error={errors.universityId?.message}
                    {...register("universityId")}
                  >
                    <option value="">Choose your university</option>
                    {grouped.map(([country, list]) => (
                      <optgroup key={country} label={country}>
                        {list.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                            {u.short_name ? ` (${u.short_name})` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </SelectField>
                )}

                <TextField label="Phone" optional type="tel" icon={Phone} autoComplete="tel" placeholder="+234 801 234 5678" error={errors.phone?.message} {...register("phone")} />

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <Button variant="clay" size="lg" onClick={() => goTo(0)} icon={<ArrowLeft size={18} aria-hidden />} aria-label="Back to step 1" />
                  <Button type="submit" size="lg" block loading={isSubmitting} disabled={!universities} icon={<UserPlus size={18} aria-hidden />}>
                    Create account
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
