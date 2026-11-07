"use client";

import { useEffect, useState } from "react";

/** Whole seconds left until a time (ms since epoch), re-rendering every second. 0 when passed or not set. */
export function useCountdown(expiresAtMs: number | null) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (expiresAtMs === null) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [expiresAtMs]);

  return expiresAtMs === null ? 0 : Math.max(Math.ceil((expiresAtMs - Date.now()) / 1000), 0);
}
