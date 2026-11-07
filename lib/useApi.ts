"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { api, type Query } from "./api";

/**
 * GET a path and track loading / error state.
 * Waits until the session has been restored (so logged-in users get their own
 * campus, not the guest view) and refetches when the user logs in or out.
 */
export function useApi<T>(path: string | null, query?: Query, options?: { pollMs?: number }) {
  const { status, user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [pollTick, setPollTick] = useState(0);
  const silent = useRef(false);
  const pollMs = options?.pollMs;

  const ready = path !== null && status !== "loading";
  const key = JSON.stringify([path, query, user?.id ?? null, tick, pollTick]);

  useEffect(() => {
    if (!ready || !path) return;
    const ctrl = new AbortController();
    // Background refreshes keep showing the current data instead of a loading state
    if (!silent.current) setLoading(true);
    silent.current = false;
    setError(null);
    api
      .get<T>(path, query, ctrl.signal)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e);
        setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  useEffect(() => {
    if (!pollMs || !ready) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      silent.current = true;
      setPollTick((t) => t + 1);
    }, pollMs);
    return () => clearInterval(timer);
  }, [pollMs, ready]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading: loading || !ready, reload };
}
