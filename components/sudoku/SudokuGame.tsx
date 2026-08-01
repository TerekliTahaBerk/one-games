"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatLongDate } from "@/lib/date";
import {
  clearAllData,
  hasSeenColoredIntro,
  markColoredIntroSeen,
} from "@/lib/sudoku/persistence";
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
import { ColoredRuleLegend } from "./ColoredRuleLegend";
import { ColoredRuleIntro } from "./ColoredRuleIntro";
import { PauseIcon, PlayIcon } from "./ControlIcons";

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
  const [introOpen, setIntroOpen] = useState(false);
  const game = useSudokuGame(date, difficulty);
  const hasColoredGroups = game.coloredGroups.length > 0;
  const filled = game.game.board.filter(Boolean).length;

  useEffect(() => {
    if (game.game.completed) queueMicrotask(() => setCompletionOpen(true));
  }, [game.game.completed]);

  // The explainer is only for puzzles that actually use the rule, and only once.
  useEffect(() => {
    if (!game.hydrated || !hasColoredGroups) return;
    queueMicrotask(() => {
      if (!hasSeenColoredIntro()) setIntroOpen(true);
    });
  }, [game.hydrated, hasColoredGroups]);

  const dismissIntro = useCallback(() => {
    markColoredIntroSeen();
    setIntroOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key.toLowerCase() === "n" && !settingsOpen)
        game.setNotesMode((value) => !value);
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

  const locked = game.paused || game.game.completed;

  return (
    <div
      className={`page sudoku-page${game.settings.reducedMotion ? " reduce-motion" : ""}`}
    >
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="10"
                cy="10"
                r="2.6"
                stroke="currentColor"
                strokeWidth="1.3"
              />
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
        <header className="game-header">
          <div className="game-title-lockup">
            <GameLogo game="sudoku" size={52} decorative />
            <div>
              <p className="caption">Daily puzzle · {formatLongDate(date)}</p>
              <h1>OneSudoku</h1>
              <p className="game-title-note">A quiet little number ritual.</p>
            </div>
          </div>

          <div className="game-status">
            <span
              className="timer"
              aria-label={`Elapsed time ${formatTimer(game.game.elapsed)}`}
            >
              {formatTimer(game.game.elapsed)}
            </span>
            <button
              type="button"
              className="pause-button"
              onClick={game.togglePause}
              disabled={!game.game.started || game.game.completed}
              aria-label={game.paused ? "Resume" : "Pause"}
            >
              {game.paused ? <PlayIcon /> : <PauseIcon />}
              <span>{game.paused ? "Resume" : "Pause"}</span>
            </button>
          </div>
        </header>

        <div className="difficulty-tabs" role="group" aria-label="Difficulty">
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
            </button>
          ))}
          <span className="difficulty-progress" aria-hidden="true">
            {filled}/81
          </span>
        </div>

        <div className="play-layout">
          <section className="board-wrap" aria-label={`${difficulty} Sudoku`}>
            <div className="board-frame">
              <SudokuBoard
                board={game.game.board}
                clues={game.clues}
                notes={game.game.notes}
                selected={game.selected}
                conflicts={game.conflicts}
                coloredGroups={game.coloredGroups}
                settings={game.settings}
                lastEntry={game.lastEntry}
                completed={game.game.completed}
                onSelect={game.setSelected}
                onEnter={game.enter}
                onErase={game.erase}
              />
              {game.paused && (
                <div className="pause-overlay">
                  <GameLogo game="sudoku" size={56} decorative />
                  <h2>Take your time.</h2>
                  <p>The puzzle is paused.</p>
                  <button
                    className="pill-primary"
                    type="button"
                    onClick={game.togglePause}
                  >
                    Resume puzzle
                  </button>
                </div>
              )}
            </div>

            <ColoredRuleLegend
              groups={game.coloredGroups}
              onExplain={() => setIntroOpen(true)}
            />
          </section>

          <aside className="control-wrap">
            {introOpen && hasColoredGroups && (
              <ColoredRuleIntro
                groups={game.coloredGroups}
                onDismiss={dismissIntro}
              />
            )}

            {game.hintMessage && (
              <div className="hint-note" role="status">
                <span>Hint</span>
                {game.hintMessage}
              </div>
            )}

            <div className="control-surface">
              <GameControls
                board={game.game.board}
                notesMode={game.notesMode}
                canUndo={game.game.history.length > 0}
                canRedo={game.game.future.length > 0}
                disabled={locked}
                onNumber={game.enter}
                onNotes={() => game.setNotesMode((value) => !value)}
                onUndo={game.undo}
                onRedo={game.redo}
                onErase={game.erase}
                onHint={game.hint}
              />
            </div>

            <p className="keyboard-note">
              <span className="keyboard-keys">
                <kbd>N</kbd> notes · <kbd>1–9</kbd> enter · <kbd>⌫</kbd> erase ·{" "}
                <kbd>↑↓←→</kbd> move ·{" "}
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
          coloredGroups={game.coloredGroups}
          stats={game.completionStats}
          onClose={() => setCompletionOpen(false)}
        />
      )}
    </div>
  );
}
