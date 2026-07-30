"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

const SESSION_KEY = "onegames-opening-shown";
const REVEAL_EVENT = "onegames:reveal";
const FALLBACK_MS = 5200;
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function HomeReveal({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"idle" | "armed" | "go">("idle");

  useIsomorphicLayoutEffect(() => {
    let shown = false;
    try {
      shown = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // Storage is optional; the content still reveals through the fallback.
    }

    if (shown) {
      setState("go");
      return;
    }

    setState("armed");
    const reveal = () => setState("go");
    window.addEventListener(REVEAL_EVENT, reveal, { once: true });
    const timer = window.setTimeout(reveal, FALLBACK_MS);
    return () => {
      window.removeEventListener(REVEAL_EVENT, reveal);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="home-reveal" data-reveal={state}>
      {children}
    </div>
  );
}
