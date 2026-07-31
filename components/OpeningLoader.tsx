"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { GAME_PALETTE } from "@/components/GameLogo";

/**
 * The opening wordmark animation, matched to OneRead's.
 *
 * `One` stays fixed while the suffix is typed and deleted, walking the family
 * from the parent brand through each game. Each suffix takes its game's accent,
 * so the loader doubles as an introduction to the identity system.
 */
const SEQUENCE = [
  { suffix: "Games", color: "#1A1A1A" },
  { suffix: "Sudoku", color: GAME_PALETTE.sudoku.accent },
  { suffix: "Word", color: GAME_PALETTE.word.accent },
  { suffix: "Match", color: GAME_PALETTE.match.accent },
  { suffix: "Numbers", color: GAME_PALETTE.numbers.accent },
] as const;

/** Only the calm, top-of-funnel pages get the opening animation. */
const PUBLIC_PATHS = new Set(["/", "/play", "/pricing", "/about"]);
const SESSION_KEY = "onegames-opening-shown";

/* Timing (ms) — the same restrained cadence as OneRead. */
const TYPE_MS = 52;
const DELETE_MS = 30;
const PAUSE_MS = 260;
const FINAL_HOLD_MS = 700;
const FADE_MS = 600;
const REDUCED_HOLD_MS = 650;

type Frame = { suffix: string; color: string; hold: number };

function buildFrames(): Frame[] {
  const frames: Frame[] = [];

  SEQUENCE.forEach(({ suffix, color }, index) => {
    const isLast = index === SEQUENCE.length - 1;

    for (let i = 1; i <= suffix.length; i += 1) {
      frames.push({ suffix: suffix.slice(0, i), color, hold: TYPE_MS });
    }
    frames[frames.length - 1].hold = isLast ? FINAL_HOLD_MS : PAUSE_MS;

    if (!isLast) {
      for (let i = suffix.length - 1; i >= 0; i -= 1) {
        frames.push({ suffix: suffix.slice(0, i), color, hold: DELETE_MS });
      }
    }
  });

  return frames;
}

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function OpeningLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [suffix, setSuffix] = useState("");
  const [color, setColor] = useState<string>("#1A1A1A");
  const timers = useRef<number[]>([]);

  useIsomorphicLayoutEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };

    if (!PUBLIC_PATHS.has(pathname)) return;

    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage can throw in private modes; treat it as not shown.
    }
    if (alreadyShown) return;

    setVisible(true);

    const startFadeOut = () => {
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Non-fatal — the loader may simply replay.
      }
      // Cue the page reveal as we fade, so the handoff reads as one motion.
      window.dispatchEvent(new Event("onegames:reveal"));
      setFading(true);
      timers.current.push(window.setTimeout(() => setVisible(false), FADE_MS));
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSuffix("Games");
      timers.current.push(window.setTimeout(startFadeOut, REDUCED_HOLD_MS));
      return clearTimers;
    }

    const frames = buildFrames();
    const play = (index: number) => {
      if (index >= frames.length) {
        startFadeOut();
        return;
      }
      const frame = frames[index];
      setSuffix(frame.suffix);
      setColor(frame.color);
      timers.current.push(window.setTimeout(() => play(index + 1), frame.hold));
    };
    play(0);

    return clearTimers;
    // Runs once on mount; pathname is only read for the initial gate.
  }, []);

  if (!visible) return null;

  return (
    <div className={`opening-loader${fading ? " is-fading" : ""}`} aria-hidden="true">
      <span className="opening-wordmark">
        <span>One</span>
        <span style={{ color }}>{suffix}</span>
        <span className="opening-caret" style={{ color }}>
          |
        </span>
      </span>
    </div>
  );
}
