"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const WORDS = ["Games", "Sudoku", "Word", "Match"];

export function OpeningLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [suffix, setSuffix] = useState("");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (pathname !== "/" && pathname !== "/play") return;
    try {
      if (sessionStorage.getItem("onegames-opening-shown")) return;
      sessionStorage.setItem("onegames-opening-shown", "1");
    } catch {
      // The brand intro is optional.
    }
    queueMicrotask(() => setVisible(true));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      queueMicrotask(() => setSuffix("Games"));
      const fadeTimer = window.setTimeout(() => setFading(true), 500);
      const hideTimer = window.setTimeout(() => setVisible(false), 900);
      return () => { window.clearTimeout(fadeTimer); window.clearTimeout(hideTimer); };
    }
    let wordIndex = 0;
    let character = 0;
    let deleting = false;
    let timer = 0;
    const tick = () => {
      const word = WORDS[wordIndex];
      if (!deleting) {
        character += 1;
        setSuffix(word.slice(0, character));
        if (character === word.length) {
          if (wordIndex === WORDS.length - 1) {
            timer = window.setTimeout(() => {
              setFading(true);
              window.setTimeout(() => setVisible(false), 550);
            }, 650);
            return;
          }
          deleting = true;
          timer = window.setTimeout(tick, 260);
          return;
        }
      } else {
        character -= 1;
        setSuffix(word.slice(0, character));
        if (character === 0) {
          deleting = false;
          wordIndex += 1;
        }
      }
      timer = window.setTimeout(tick, deleting ? 34 : 55);
    };
    timer = window.setTimeout(tick, 120);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;
  return (
    <div className={`opening-loader ${fading ? "is-fading" : ""}`} aria-hidden="true">
      <span><b>One</b><em>{suffix}</em><i>|</i></span>
    </div>
  );
}
