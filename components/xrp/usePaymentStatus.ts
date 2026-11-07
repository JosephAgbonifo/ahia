"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type PayStatus = "pending_payment" | "paid" | "cancelled" | "expired";

/** Asks the API what happened to an order's payment every few seconds until it settles. */
export function usePaymentStatus(orderId: string | number, enabled = true) {
  const [status, setStatus] = useState<PayStatus>("pending_payment");
  const stopped = useRef(false);

  const check = useCallback(async () => {
    try {
      const d = await api.get<{ status: PayStatus }>(`/orders/${orderId}/payment`);
      setStatus(d.status);
      return d.status;
    } catch {
      return null; // keep waiting: the network or the ledger may just be slow
    }
  }, [orderId]);

  useEffect(() => {
    if (!enabled || status !== "pending_payment") return;
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      const s = await check();
      if (!stopped.current && (s === null || s === "pending_payment")) timer = setTimeout(loop, 2500);
    };
    timer = setTimeout(loop, 1200);
    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
  }, [enabled, status, check]);

  return { status, check };
}
