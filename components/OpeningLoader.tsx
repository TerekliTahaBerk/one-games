"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const WORDS = ["Games", "Sudoku", "Word", "Match"];
const COLORS = ["#1a1a1a", "#3f6fa8", "#745f9a", "#8b667c"];
const SESSION_KEY = "onegames-opening-shown";
const PUBLIC_PATHS = new Set(["/", "/play", "/pricing"]);
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function OpeningLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [suffix, setSuffix] = useState("");
  const [fading, setFading] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const timers = useRef<number[]>([]);

  useIsomorphicLayoutEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
    if (!PUBLIC_PATHS.has(pathname)) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // The brand intro is optional.
    }
    setVisible(true);

    const finish = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Storage is optional.
      }
      window.dispatchEvent(new Event("onegames:reveal"));
      setFading(true);
      timers.current.push(window.setTimeout(() => setVisible(false), 600));
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setSuffix("Games");
      timers.current.push(window.setTimeout(finish, 650));
      return clearTimers;
    }

    let currentWord = 0;
    let character = 0;
    let deleting = false;
    const tick = () => {
      const word = WORDS[currentWord];
      if (!deleting) {
        character += 1;
        setSuffix(word.slice(0, character));
        if (character === word.length) {
          if (currentWord === WORDS.length - 1) {
            timers.current.push(window.setTimeout(finish, 750));
            return;
          }
          deleting = true;
          timers.current.push(window.setTimeout(tick, 300));
          return;
        }
      } else {
        character -= 1;
        setSuffix(word.slice(0, character));
        if (character === 0) {
          deleting = false;
          currentWord += 1;
          setWordIndex(currentWord);
        }
      }
      timers.current.push(window.setTimeout(tick, deleting ? 34 : 55));
    };
    timers.current.push(window.setTimeout(tick, 120));
    return clearTimers;
  }, [pathname]);

  if (!visible) return null;
  return (
    <div className={`opening-loader ${fading ? "is-fading" : ""}`} aria-hidden="true">
      <span><b>One</b><em style={{ color: COLORS[wordIndex] }}>{suffix}</em><i style={{ color: COLORS[wordIndex] }}>|</i></span>
    </div>
  );
}
