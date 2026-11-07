"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/ui/PageLoader";
import { homeFor, safeNext } from "@/lib/auth-redirect";
import { useAuth } from "./AuthProvider";

/** Wrap pages that need a logged-in user. Pass role="admin" for admin pages. */
export function RequireAuth({ children, role }: { children: ReactNode; role?: "admin" }) {
  const { user, status, isSigningOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const roleOk = !role || user?.role === role;

  useEffect(() => {
    if (isSigningOut) return;
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && user && !roleOk) {
      router.replace(homeFor(user));
    }
  }, [status, user, roleOk, isSigningOut, pathname, router]);

  if (status !== "authenticated" || !roleOk) {
    return <PageLoader label={status === "loading" ? "Loading your account" : "Redirecting"} />;
  }
  return <>{children}</>;
}

/** Wrap login / register pages: logged-in users are sent to their dashboard. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(safeNext(params.get("next")) ?? homeFor(user));
    }
  }, [status, user, params, router]);

  if (status === "loading" || status === "authenticated") {
    return <PageLoader label={status === "loading" ? "Loading" : "Taking you to your dashboard"} />;
  }
  return <>{children}</>;
}
