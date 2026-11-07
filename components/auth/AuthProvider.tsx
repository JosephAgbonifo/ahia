"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  auth,
  onSessionExpired,
  restoreSession,
  setAccessToken,
  type RegisterInput,
  type User,
} from "@/lib/api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  /** True while a manual log out is in flight, so guards don't redirect to /login. */
  isSigningOut: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  /** Revoke every session on every device, then sign out here */
  logoutAll: () => Promise<void>;
  /** Re-fetch /auth/me (e.g. after verifying email or KYC approval). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signedIn = useCallback((u: User) => {
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const signedOut = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await restoreSession();
      if (!token) {
        if (active) signedOut();
        return;
      }
      try {
        const me = await auth.me();
        if (active) signedIn(me);
      } catch {
        if (active) signedOut();
      }
    })();
    return () => {
      active = false;
    };
  }, [signedIn, signedOut]);

  // A refresh that fails mid-session means the user must log in again.
  useEffect(() => {
    onSessionExpired(() => {
      signedOut();
      toast.info("Your session expired. Log in again to continue.");
    });
    return () => onSessionExpired(null);
  }, [signedOut]);

  // Clear the signing-out flag once we've landed on the home page.
  useEffect(() => {
    if (isSigningOut && pathname === "/") setIsSigningOut(false);
  }, [isSigningOut, pathname]);

  const login = useCallback(
    async (email: string, password: string) =>
      signedIn(await auth.login(email, password)),
    [signedIn]
  );

  const register = useCallback(
    async (input: RegisterInput) => signedIn(await auth.register(input)),
    [signedIn]
  );

  const logout = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await auth.logout();
    } catch {
      /* the local session is cleared either way */
    }
    signedOut();
    router.replace("/");
    toast.success("You're logged out");
  }, [router, signedOut]);

  const logoutAll = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await auth.logoutAll();
    } catch {
      /* the local session is cleared either way */
    }
    signedOut();
    router.replace("/");
    toast.success("You're logged out on all devices");
  }, [router, signedOut]);

  const refreshUser = useCallback(async () => {
    try {
      signedIn(await auth.me());
    } catch {
      /* ignore: a 401 is handled by the session-expired hook */
    }
  }, [signedIn]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, isSigningOut, login, register, logout, logoutAll, refreshUser }),
    [user, status, isSigningOut, login, register, logout, logoutAll, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
