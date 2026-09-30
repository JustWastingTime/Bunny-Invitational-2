"use client";

import { useEffect, useState } from "react";
import type { PlayInPayload } from "@/lib/types";

export function usePlayInData() {
  const [data, setData] = useState<PlayInPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function tick() {
      try {
        const res = await fetch("/api/play-in", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as PlayInPayload;
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
      timer = setInterval(tick, 15000);
    }

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
  }, []);

  return { data, error };
}
