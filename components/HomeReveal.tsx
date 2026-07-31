"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const SESSION_KEY = "onegames-opening-shown";
const REVEAL_EVENT = "onegames:reveal";
/** Safety net: reveal anyway if the loader never signals (e.g. it errored). */
const FALLBACK_MS = 6000;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Coordinates the staggered content reveal with the opening loader.
 *
 * On the first visit the wrapper stays "armed" (hidden) until the loader fires
 * `onegames:reveal` as it fades; on later visits it reveals immediately, before
 * paint. Without JS the CSS default is fully visible, so content is never
 * trapped behind this.
 */
export function HomeReveal({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"idle" | "armed" | "go">("idle");
  const timer = useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage may be unavailable — treat it as not shown.
    }

    if (alreadyShown) {
      setState("go");
      return;
    }

    setState("armed");
    const reveal = () => setState("go");
    window.addEventListener(REVEAL_EVENT, reveal, { once: true });
    timer.current = window.setTimeout(reveal, FALLBACK_MS);

    return () => {
      window.removeEventListener(REVEAL_EVENT, reveal);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="home-reveal" data-reveal={state}>
      {children}
    </div>
  );
}
