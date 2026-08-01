"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameLogo } from "@/components/GameLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useModalFocus } from "@/components/dna/useModalFocus";
import { formatLongDate, getTodayKey } from "@/lib/date";
import { buildKeyboardState, evaluateGuess } from "@/lib/word/evaluate";
import {
  clearAllWordData,
  DEFAULT_WORD_SETTINGS,
  DEFAULT_WORD_STATS,
  hasSeenWordHelp,
  loadWordGame,
  loadWordSettings,
  loadWordStats,
  markWordHelpSeen,
  recordWordCompletion,
  saveWordGame,
  saveWordSettings,
} from "@/lib/word/persistence";
import { isAcceptedWord, getWordPuzzle } from "@/lib/word/puzzles";
import { buildWordShare, shareOrCopy } from "@/lib/word/share";
import {
  WORD_SAVE_VERSION,
  type WordGameSave,
  type WordSettings,
  type WordStats,
} from "@/lib/word/types";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const emptyGame = (date: string, puzzleId: string): WordGameSave => ({
  version: WORD_SAVE_VERSION,
  puzzleId,
  date,
  guesses: [],
  currentGuess: "",
  status: "playing",
  elapsed: 0,
});

function Dialog({
  open,
  onClose,
  className = "",
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  label: string;
  children: React.ReactNode;
}) {
  const ref = useModalFocus(open, onClose);
  if (!open) return null;
  return (
    <div
      className="modal-backdrop word-modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={ref}
        className={`word-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </section>
    </div>
  );
}

export function WordGame({ date }: { date: string }) {
  const puzzle = useMemo(() => getWordPuzzle(date), [date]);
  const [game, setGame] = useState(() => emptyGame(date, puzzle.id));
  const [settings, setSettings] = useState<WordSettings>(DEFAULT_WORD_SETTINGS);
  const [stats, setStats] = useState<WordStats>(DEFAULT_WORD_STATS);
  const [hydrated, setHydrated] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [message, setMessage] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const inputLock = useRef(false);
  const isToday = date === getTodayKey();

  useEffect(() => {
    queueMicrotask(() => {
      const stored = loadWordGame(date, puzzle.id);
      const next = stored ?? emptyGame(date, puzzle.id);
      setGame(next);
      setSettings(loadWordSettings());
      setStats(loadWordStats());
      if (!hasSeenWordHelp()) setHelpOpen(true);
      if (next.status !== "playing") setCompletionOpen(true);
      setHydrated(true);
    });
  }, [date, puzzle.id]);

  useEffect(() => {
    if (hydrated) saveWordGame(game);
  }, [game, hydrated]);
  useEffect(() => {
    if (!hydrated || game.status !== "playing" || !game.startedAt) return;
    const timer = window.setInterval(
      () =>
        setGame((current) => ({ ...current, elapsed: current.elapsed + 1 })),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [game.startedAt, game.status, hydrated]);

  const evaluations = useMemo(
    () => game.guesses.map((guess) => evaluateGuess(guess, puzzle.answer)),
    [game.guesses, puzzle.answer],
  );
  const keyboardState = useMemo(
    () => buildKeyboardState(evaluations),
    [evaluations],
  );
  const notify = useCallback((text: string) => {
    setMessage("");
    queueMicrotask(() => setMessage(text));
  }, []);

  const complete = useCallback(
    (next: WordGameSave) => {
      saveWordGame(next);
      const nextStats = recordWordCompletion(next, isToday);
      setStats(nextStats);
      window.setTimeout(
        () => setCompletionOpen(true),
        settings.reducedMotion ? 20 : 820,
      );
    },
    [isToday, settings.reducedMotion],
  );

  const submit = useCallback(() => {
    if (inputLock.current || revealing || game.status !== "playing") return;
    if (game.currentGuess.length !== 5) {
      notify("Not enough letters");
      return;
    }
    if (!isAcceptedWord(game.currentGuess)) {
      notify("Not in the word list");
      return;
    }
    inputLock.current = true;
    setRevealing(true);
    const guesses = [...game.guesses, game.currentGuess];
    const won = game.currentGuess === puzzle.answer;
    const lost = !won && guesses.length === 6;
    const next: WordGameSave = {
      ...game,
      guesses,
      currentGuess: "",
      status: won ? "won" : lost ? "lost" : "playing",
      startedAt: game.startedAt ?? new Date().toISOString(),
      completedAt: won || lost ? new Date().toISOString() : undefined,
    };
    setGame(next);
    if (won || lost) complete(next);
    window.setTimeout(
      () => {
        inputLock.current = false;
        setRevealing(false);
      },
      settings.reducedMotion ? 20 : 650,
    );
  }, [
    complete,
    game,
    notify,
    puzzle.answer,
    revealing,
    settings.reducedMotion,
  ]);

  const press = useCallback(
    (key: string) => {
      if (
        !hydrated ||
        inputLock.current ||
        revealing ||
        game.status !== "playing"
      )
        return;
      if (key === "ENTER") {
        submit();
        return;
      }
      if (key === "BACKSPACE" || key === "DELETE") {
        setGame((current) => ({
          ...current,
          currentGuess: current.currentGuess.slice(0, -1),
        }));
        return;
      }
      if (/^[A-Z]$/.test(key))
        setGame((current) =>
          current.currentGuess.length >= 5
            ? current
            : {
                ...current,
                currentGuess: current.currentGuess + key,
                startedAt: current.startedAt ?? new Date().toISOString(),
              },
        );
    },
    [game.status, hydrated, revealing, submit],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        helpOpen ||
        settingsOpen ||
        completionOpen ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const key = event.key.toUpperCase();
      if (
        /^[A-Z]$/.test(key) ||
        key === "ENTER" ||
        key === "BACKSPACE" ||
        key === "DELETE"
      ) {
        event.preventDefault();
        press(key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [completionOpen, helpOpen, press, settingsOpen]);

  const closeHelp = () => {
    markWordHelpSeen();
    setHelpOpen(false);
  };
  const updateSettings = (next: WordSettings) => {
    setSettings(next);
    saveWordSettings(next);
  };
  const share = async () => {
    try {
      const result = await shareOrCopy(
        buildWordShare(puzzle.number, game.guesses, puzzle.answer, game.status),
      );
      notify(result === "shared" ? "Shared" : "Copied results");
    } catch {}
  };
  const reset = () => {
    if (
      !window.confirm(
        "Reset all OneWord progress, settings, and statistics on this browser?",
      )
    )
      return;
    clearAllWordData();
    window.location.reload();
  };

  return (
    <div
      className={`page word-page${settings.reducedMotion ? " reduce-motion" : ""}${settings.highContrast ? " word-high-contrast" : ""}`}
    >
      <SiteHeader
        back="/"
        trailing={
          <div className="word-header-actions">
            <button onClick={() => setHelpOpen(true)} aria-label="How to play">
              ?
            </button>
            <button onClick={() => setSettingsOpen(true)} aria-label="Settings">
              ⚙
            </button>
          </div>
        }
      />
      <main className="word-main">
        <section className="word-title" aria-labelledby="word-heading">
          <GameLogo game="word" size={54} decorative />
          <span>
            <h1 id="word-heading">OneWord</h1>
            <p>
              {isToday ? "Today" : formatLongDate(date)} · Puzzle #
              {puzzle.number}
            </p>
          </span>
          <Link href="/word/archive">Archive</Link>
        </section>
        <div className="word-toast" role="status" aria-live="polite">
          {message}
        </div>
        <section className="word-board" aria-label="Six guess rows">
          {Array.from({ length: 6 }, (_, rowIndex) => {
            const submitted = game.guesses[rowIndex];
            const active =
              rowIndex === game.guesses.length && game.status === "playing";
            const letters = submitted ?? (active ? game.currentGuess : "");
            return (
              <div
                className={`word-row${submitted ? " is-submitted" : ""}${submitted && rowIndex === game.guesses.length - 1 && revealing ? " is-revealing" : ""}`}
                key={rowIndex}
                aria-label={`Guess ${rowIndex + 1}`}
              >
                {Array.from({ length: 5 }, (_, columnIndex) => {
                  const result = submitted
                    ? evaluations[rowIndex][columnIndex]
                    : null;
                  const letter = letters[columnIndex] ?? "";
                  return (
                    <div
                      key={columnIndex}
                      className={`word-tile${letter ? " has-letter" : ""}${result ? ` is-${result.state}` : ""}`}
                      aria-label={
                        result
                          ? `${letter}, ${result.state}`
                          : letter || "empty"
                      }
                      style={
                        {
                          "--delay": `${columnIndex * 90}ms`,
                        } as React.CSSProperties
                      }
                    >
                      <span>{letter}</span>
                      {result && <i aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
        <section className="word-keyboard" aria-label="On-screen keyboard">
          {ROWS.map((row, rowIndex) => (
            <div className="word-keyboard-row" key={row}>
              {rowIndex === 2 && (
                <button className="is-wide" onClick={() => press("ENTER")}>
                  Enter
                </button>
              )}
              {[...row].map((letter) => (
                <button
                  key={letter}
                  onClick={() => press(letter)}
                  className={
                    keyboardState[letter] ? `is-${keyboardState[letter]}` : ""
                  }
                  aria-label={`${letter}${keyboardState[letter] ? `, ${keyboardState[letter]}` : ""}`}
                >
                  {letter}
                  <i aria-hidden="true" />
                </button>
              ))}
              {rowIndex === 2 && (
                <button
                  className="is-wide"
                  onClick={() => press("BACKSPACE")}
                  aria-label="Delete"
                >
                  ⌫
                </button>
              )}
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />

      <Dialog open={helpOpen} onClose={closeHelp} label="How to play OneWord">
        <button
          className="word-modal-close"
          onClick={closeHelp}
          aria-label="Close"
        >
          ×
        </button>
        <GameLogo game="word" size={58} decorative />
        <h2>Find today&rsquo;s word.</h2>
        <p>
          Guess the five-letter word in six tries. Every guess must be in the
          word list.
        </p>
        <div className="word-example">
          <span className="is-correct">
            S<i />
          </span>
          <span className="is-present">
            O<i />
          </span>
          <span className="is-absent">
            F<i />
          </span>
          <span>T</span>
          <span>Y</span>
        </div>
        <ul className="word-legend">
          <li>
            <i className="correct" /> Right letter, right place
          </li>
          <li>
            <i className="present" /> In the word, different place
          </li>
          <li>
            <i className="absent" /> Not in the word
          </li>
        </ul>
        <p className="note">
          Color and shape always work together, so feedback never depends on
          color alone.
        </p>
        <button className="pill-primary" onClick={closeHelp}>
          Let&rsquo;s play
        </button>
      </Dialog>
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        label="OneWord settings"
      >
        <button
          className="word-modal-close"
          onClick={() => setSettingsOpen(false)}
          aria-label="Close"
        >
          ×
        </button>
        <h2>Settings</h2>
        <label className="word-setting">
          <span>
            <strong>Reduced motion</strong>
            <small>Shorten tile reveals and transitions.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) =>
              updateSettings({
                ...settings,
                reducedMotion: event.target.checked,
              })
            }
          />
        </label>
        <label className="word-setting">
          <span>
            <strong>Higher contrast</strong>
            <small>Strengthen tile and keyboard feedback.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(event) =>
              updateSettings({
                ...settings,
                highContrast: event.target.checked,
              })
            }
          />
        </label>
        <button
          className="text-action"
          onClick={() => {
            setSettingsOpen(false);
            setHelpOpen(true);
          }}
        >
          Replay how to play
        </button>
        <button className="text-action is-danger" onClick={reset}>
          Reset OneWord data
        </button>
      </Dialog>
      <Dialog
        open={completionOpen}
        onClose={() => setCompletionOpen(false)}
        className="word-completion"
        label="OneWord results"
      >
        <button
          className="word-modal-close"
          onClick={() => setCompletionOpen(false)}
          aria-label="Close"
        >
          ×
        </button>
        <GameLogo game="word" size={64} decorative />
        <p className="word-kicker">Puzzle #{puzzle.number}</p>
        <h2>
          {game.status === "won" ? "Lovely work." : "Tomorrow is another word."}
        </h2>
        <p>
          {game.status === "won" ? (
            `You found it in ${game.guesses.length} ${game.guesses.length === 1 ? "guess" : "guesses"}.`
          ) : (
            <>
              The word was <strong>{puzzle.answer}</strong>.
            </>
          )}
        </p>
        <div className="word-stats">
          <span>
            <strong>{stats.played}</strong>
            <small>Played</small>
          </span>
          <span>
            <strong>
              {stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}
            </strong>
            <small>Win %</small>
          </span>
          <span>
            <strong>{stats.currentStreak}</strong>
            <small>Streak</small>
          </span>
          <span>
            <strong>{stats.maxStreak}</strong>
            <small>Best</small>
          </span>
        </div>
        <div className="word-distribution" aria-label="Guess distribution">
          {stats.distribution.map((count, index) => (
            <div key={index}>
              <span>{index + 1}</span>
              <i
                style={{
                  width: `${Math.max(12, (count / Math.max(1, ...stats.distribution)) * 100)}%`,
                }}
              >
                {count}
              </i>
            </div>
          ))}
        </div>
        <button className="pill-primary" onClick={share}>
          Share results
        </button>
        <Link className="text-action" href="/word/archive">
          Open archive
        </Link>
      </Dialog>
    </div>
  );
}
