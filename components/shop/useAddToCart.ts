"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { refreshBadges } from "@/components/layout/useBadgeCounts";

/** Add to cart; sends guests to log in first and refreshes the header badge. */
export function useAddToCart() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  const add = useCallback(
    async (productId: number, quantity = 1) => {
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return false;
      }
      setBusy(productId);
      try {
        await api.post("/cart/items", { productId, quantity });
        refreshBadges();
        toast.success("Added to cart");
        return true;
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't add to cart");
        return false;
      } finally {
        setBusy(null);
      }
    },
    [user, router]
  );

  return { add, busy };
}
