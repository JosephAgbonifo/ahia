"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";

interface WishlistValue {
  has: (productId: number) => boolean;
  toggle: (productId: number) => Promise<void>;
  count: number;
}

const WishlistContext = createContext<WishlistValue | null>(null);
type Items = { items: { id: number }[] };

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    api
      .get<Items>("/wishlist")
      .then((d) => setIds(new Set(d.items.map((i) => i.id))))
      .catch(() => undefined);
  }, [user]);

  const toggle = useCallback(
    async (productId: number) => {
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const saved = ids.has(productId);
      try {
        const d = saved
          ? await api.delete<Items>(`/wishlist/${productId}`)
          : await api.post<Items>(`/wishlist/${productId}`);
        setIds(new Set(d.items.map((i) => i.id)));
        toast.success(saved ? "Removed from saved items" : "Saved for later");
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't update saved items");
      }
    },
    [user, ids, router]
  );

  const value = useMemo(() => ({ has: (id: number) => ids.has(id), toggle, count: ids.size }), [ids, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
