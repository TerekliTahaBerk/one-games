"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatLongDate } from "@/lib/date";
import { clearAllData } from "@/lib/sudoku/persistence";
import { DIFFICULTIES } from "@/lib/sudoku/puzzles";
import type { Difficulty } from "@/lib/sudoku/types";
import { useSudokuGame } from "@/hooks/useSudokuGame";
import { GameLogo } from "@/components/GameLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { GameControls } from "./GameControls";
import { SudokuBoard } from "./SudokuBoard";
import { SettingsPanel } from "./SettingsPanel";
import { CompletionPanel } from "./CompletionPanel";

function formatTimer(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

interface Props {
  date: string;
  initialDifficulty?: Difficulty;
}

export function SudokuGame({ date, initialDifficulty = "medium" }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(true);
  const game = useSudokuGame(date, difficulty);

  useEffect(() => {
    if (game.game.completed) queueMicrotask(() => setCompletionOpen(true));
  }, [game.game.completed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key.toLowerCase() === "n" && !settingsOpen) game.setNotesMode((value) => !value);
      if (event.key === "Escape" && game.paused) game.togglePause();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [game, settingsOpen]);

  if (!game.hydrated) {
    return (
      <main className="game-loading">
        <span>OneGames</span>
        <p>Preparing today’s grid…</p>
      </main>
    );
  }

  return (
    <div className={`page${game.settings.reducedMotion ? " reduce-motion" : ""}`}>
      <SiteHeader
        back="/"
        trailing={
          <button
            type="button"
            className="quiet-icon-link"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        }
      />

      <main className="game-main">
        <div className="game-title-row">
          <p className="caption">Daily puzzle · {formatLongDate(date)}</p>
          <div className="game-title-line">
            <div className="game-title-lockup">
              <GameLogo game="sudoku" size={52} decorative />
              <h1>OneSudoku</h1>
            </div>
            <div className="timer-group">
              <span className="timer" aria-label={`Elapsed time ${formatTimer(game.game.elapsed)}`}>
                {formatTimer(game.game.elapsed)}
              </span>
              <button
                type="button"
                className="pause-button"
                onClick={game.togglePause}
                disabled={!game.game.started || game.game.completed}
              >
                {game.paused ? "Resume" : "Pause"}
              </button>
            </div>
          </div>
        </div>

        <div className="difficulty-tabs" aria-label="Difficulty">
          {DIFFICULTIES.map((level) => (
            <button
              type="button"
              key={level}
              className={difficulty === level ? "is-active" : ""}
              aria-pressed={difficulty === level}
              onClick={() => {
                setCompletionOpen(true);
                setDifficulty(level);
              }}
            >
              {level}
              {difficulty === level && <span aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="play-layout">
          <section className="board-wrap" aria-label={`${difficulty} Sudoku`}>
            <SudokuBoard
              board={game.game.board}
              clues={game.clues}
              notes={game.game.notes}
              selected={game.selected}
              conflicts={game.conflicts}
              settings={game.settings}
              onSelect={game.setSelected}
              onEnter={game.enter}
              onErase={game.erase}
            />
            {game.paused && (
              <div className="pause-overlay">
                <GameLogo game="sudoku" size={56} decorative />
                <h2>Take your time.</h2>
                <p>The puzzle is paused.</p>
                <button className="pill-primary" type="button" onClick={game.togglePause}>
                  Resume puzzle
                </button>
              </div>
            )}
          </section>

          <aside className="control-wrap">
            {game.hintMessage && (
              <div className="hint-note" role="status">
                <span>Hint</span>
                {game.hintMessage}
              </div>
            )}
            <GameControls
              board={game.game.board}
              notesMode={game.notesMode}
              canUndo={game.game.history.length > 0}
              canRedo={game.game.future.length > 0}
              onNumber={game.enter}
              onNotes={() => game.setNotesMode((value) => !value)}
              onUndo={game.undo}
              onRedo={game.redo}
              onErase={game.erase}
              onHint={game.hint}
            />
            <p className="keyboard-note">
              <span className="keyboard-keys">
                <kbd>N</kbd> notes · <kbd>1–9</kbd> enter · <kbd>⌫</kbd> erase · <kbd>↑↓←→</kbd>{" "}
                move ·{" "}
              </span>
              <Link href="/sudoku/archive" className="link-underline">
                Archive
              </Link>
            </p>
          </aside>
        </div>

        <div className="sr-only" aria-live="polite">
          {game.announcement}
        </div>
      </main>

      <SiteFooter />

      <SettingsPanel
        open={settingsOpen}
        settings={game.settings}
        onChange={game.updateSettings}
        onClose={() => setSettingsOpen(false)}
        onReset={() => {
          game.reset();
          setSettingsOpen(false);
        }}
        onResetAll={() => {
          clearAllData();
          window.location.reload();
        }}
      />
      {game.game.completed && completionOpen && game.completionStats && (
        <CompletionPanel
          game={game.game}
          difficulty={difficulty}
          stats={game.completionStats}
          onClose={() => setCompletionOpen(false)}
        />
      )}
    </div>
  );
}
