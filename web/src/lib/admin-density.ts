"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const KEY = "admin:density";
type Density = "comfortable" | "compact";

const listeners = new Set<() => void>();
let cached: Density = "comfortable";

function load(): Density {
  if (typeof window === "undefined") return "comfortable";
  const raw = window.localStorage.getItem(KEY);
  return raw === "compact" ? "compact" : "comfortable";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  for (const cb of listeners) cb();
}

export function useDensity(): [Density, (next: Density) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => cached,
    () => "comfortable" as const,
  );

  useEffect(() => {
    cached = load();
    notify();
  }, []);

  const set = useCallback((next: Density) => {
    cached = next;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, next);
      document
        .querySelector(".admin-shell")
        ?.setAttribute("data-density", next);
    }
    notify();
  }, []);

  return [value, set];
}
