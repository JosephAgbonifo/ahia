"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, LogIn, Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { safeNext } from "@/lib/auth-redirect";
import { handleFormError } from "@/lib/forms";
import { loginSchema, type LoginValues } from "@/lib/validation";

function LoginForm() {
  const { login } = useAuth();
  const next = safeNext(useSearchParams().get("next"));
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.first_name}`);
      // GuestOnly redirects to ?next= or the right dashboard
    } catch (err) {
      setFormError(handleFormError(err, setError, ["email", "password"]));
    }
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to buy, sell and manage your orders."
      footer={
        <>
          New to Ahia?{" "}
          <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: "1.1rem" }}>
        {formError && (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={18} aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <TextField
          label="Email"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="you@university.edu"
          error={errors.email?.message}
          {...register("email")}
        />

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <TextField
            label="Password"
            type="password"
            icon={Lock}
            autoComplete="current-password"
            placeholder="Your password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Link href="/forgot-password" style={{ justifySelf: "end", fontSize: "0.9rem", fontWeight: 600 }}>
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" block loading={isSubmitting} icon={<LogIn size={18} aria-hidden />}>
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
