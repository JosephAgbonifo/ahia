"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { WishlistProvider } from "@/components/shop/WishlistProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user" makes every framer-motion animation respect the OS setting
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <WishlistProvider>{children}</WishlistProvider>
        <Toaster
          position="top-center"
          toastOptions={{ unstyled: true, classNames: { toast: "clay-toast" } }}
        />
      </AuthProvider>
    </MotionConfig>
  );
}
