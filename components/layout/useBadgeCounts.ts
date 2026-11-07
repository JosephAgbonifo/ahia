"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface BadgeCounts {
  cart: number;
  messages: number;
  notifications: number;
  /** Paid orders waiting for the seller to fulfil */
  fulfil: number;
}

const ZERO: BadgeCounts = { cart: 0, messages: 0, notifications: 0, fulfil: 0 };
const EVENT = "ahia:badges";

/** Call after adding to cart, reading messages, etc. to refresh header badges now. */
export const refreshBadges = () => window.dispatchEvent(new Event(EVENT));

/** Cart, unread messages and unread notifications for the header. Polls every minute. */
export function useBadgeCounts(enabled: boolean, isSeller = false): BadgeCounts {
  const [counts, setCounts] = useState<BadgeCounts>(ZERO);

  useEffect(() => {
    if (!enabled) {
      setCounts(ZERO);
      return;
    }
    let alive = true;

    const load = async () => {
      const [cart, messages, notifications, fulfil] = await Promise.allSettled([
        api.get<{ cart: { itemCount: number } }>("/cart"),
        api.get<{ unread: number }>("/conversations/unread-count"),
        api.get<{ unread: number }>("/notifications", { unread: true, limit: 1 }),
        isSeller ? api.get<{ page: { total: number } }>("/seller/orders", { status: "paid", limit: 1 }) : Promise.resolve({ page: { total: 0 } }),
      ]);
      if (!alive) return;
      setCounts((prev) => ({
        cart: cart.status === "fulfilled" ? cart.value.cart.itemCount : prev.cart,
        messages: messages.status === "fulfilled" ? messages.value.unread : prev.messages,
        notifications: notifications.status === "fulfilled" ? notifications.value.unread : prev.notifications,
        fulfil: fulfil.status === "fulfilled" ? fulfil.value.page.total : prev.fulfil,
      }));
    };

    const onVisible = () => document.visibilityState === "visible" && load();

    load();
    const timer = setInterval(load, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(EVENT, load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(EVENT, load);
    };
  }, [enabled, isSeller]);

  return counts;
}
