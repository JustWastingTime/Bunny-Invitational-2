"use client";

import { useEffect, useState } from "react";
import type { PublicPayload } from "@/lib/types";

export function usePublicData(intervalMs = 4000, source: "public" | "staff" = "public") {
  const [data, setData] = useState<PublicPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function tick() {
      try {
        const res = await fetch(source === "staff" ? "/api/staff/state" : "/api/public", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as PublicPayload;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      }
    }

    function stop() {
      if (timer === undefined) return;
      clearInterval(timer);
      timer = undefined;
    }

    function start() {
      if (timer !== undefined) return;
      timer = setInterval(tick, intervalMs);
    }

    // A hidden tab costs database work nobody is looking at, and most tabs are
    // hidden. The interval pauses while hidden and a tick fires the moment the
    // tab comes back, so returning always lands on fresh data rather than
    // whatever frame was on screen when it was left.
    function onVisibility() {
      if (document.hidden) {
        stop();
        return;
      }
      void tick();
      start();
    }

    void tick();
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, source]);

  return { data, error };
}
