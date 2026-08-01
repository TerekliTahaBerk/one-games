"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GameLogo } from "@/components/GameLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatLongDate } from "@/lib/date";
import {
  clearAllDnaData,
  hasSeenDnaTutorial,
  markDnaTutorialSeen,
} from "@/lib/dna/persistence";
import { DNA_DIFFICULTIES } from "@/lib/dna/puzzles";
import type { DnaDifficulty } from "@/lib/dna/types";
import { useDnaGame } from "@/hooks/useDnaGame";
import { DnaBoard } from "./DnaBoard";
import { DnaCompletionPanel } from "./DnaCompletionPanel";
import { DnaControls } from "./DnaControls";
import { DnaSettingsPanel } from "./DnaSettingsPanel";
import { DnaTutorial } from "./DnaTutorial";

const time = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export function DnaGame({
  date,
  initialDifficulty = "medium",
}: {
  date: string;
  initialDifficulty?: DnaDifficulty;
}) {
  const [difficulty, setDifficulty] =
    useState<DnaDifficulty>(initialDifficulty);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(true);
  const game = useDnaGame(date, difficulty);
  const { paused, redo, togglePause, undo } = game;
  useEffect(() => {
    if (game.hydrated && !hasSeenDnaTutorial())
      queueMicrotask(() => setTutorialOpen(true));
  }, [game.hydrated]);
  useEffect(() => {
    if (game.game.completed) queueMicrotask(() => setCompletionOpen(true));
  }, [game.game.completed]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (event.key === "Escape" && paused) togglePause();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [paused, redo, togglePause, undo]);
  if (!game.hydrated)
    return (
      <main className="game-loading">
        <span>OneDna</span>
        <p>Preparing today’s sequence…</p>
      </main>
    );
  const locked = game.paused || game.game.completed;
  return (
    <div
      className={`page dna-page${game.settings.reducedMotion ? " reduce-motion" : ""}`}
    >
      <SiteHeader
        back="/"
        trailing={
          <button
            className="quiet-icon-link"
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open OneDna settings"
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
      <main className="game-main dna-main">
        <header className="game-header">
          <div className="game-title-lockup">
            <GameLogo game="dna" size={52} decorative />
            <div>
              <p className="caption">Daily puzzle · {formatLongDate(date)}</p>
              <h1>OneDna</h1>
              <p className="dna-title-note">Find every perfect pair.</p>
            </div>
          </div>
          <div className="game-status">
            <span
              className="timer"
              aria-label={`Elapsed time ${time(game.game.elapsed)}`}
            >
              {time(game.game.elapsed)}
            </span>
            <button
              className="pause-button"
              type="button"
              onClick={game.togglePause}
              disabled={!game.game.started || game.game.completed}
              aria-label={game.paused ? "Resume" : "Pause"}
            >
              {game.paused ? "Resume" : "Pause"}
            </button>
          </div>
        </header>
        <div className="difficulty-tabs" role="group" aria-label="Difficulty">
          {DNA_DIFFICULTIES.map((item) => (
            <button
              key={item}
              className={difficulty === item ? "is-active" : ""}
              type="button"
              onClick={() => setDifficulty(item)}
              aria-pressed={difficulty === item}
            >
              {item}
            </button>
          ))}
          <span className="difficulty-progress">
            {game.game.board.filter(Boolean).length}/{game.puzzle.size ** 2}
          </span>
        </div>
        <section className="dna-rule-legend" aria-label="OneDna rules">
          <span className="dna-rule-pairs">
            <i className="family-at" /> A–T <b>+</b> <i className="family-cg" />{" "}
            C–G balance
          </span>
          <span>All four · every line</span>
          <span>No matching neighbors</span>
          <span>Links complete a pair</span>
          <button type="button" onClick={() => setTutorialOpen(true)}>
            How to play
          </button>
        </section>
        <div className="dna-play-area">
          <div className="dna-board-stage">
            <DnaBoard
              board={game.game.board}
              clues={game.puzzle.clues}
              size={game.puzzle.size}
              bonds={game.puzzle.bonds}
              selected={game.selected}
              conflicts={game.conflicts}
              hintCells={game.hintCells}
              locked={locked}
              highlightRelated={game.settings.highlightRelated}
              highlightBonded={game.settings.highlightBonded}
              onSelect={game.setSelected}
              onEnter={game.enter}
              onErase={game.erase}
            />
            {game.paused ? (
              <button
                className="dna-pause-cover"
                type="button"
                onClick={game.togglePause}
              >
                <strong>Paused</strong>
                <span>Tap to continue</span>
              </button>
            ) : null}
          </div>
          <DnaControls
            locked={locked}
            canUndo={Boolean(game.game.history.length)}
            canRedo={Boolean(game.game.future.length)}
            onEnter={game.enter}
            onErase={game.erase}
            onUndo={game.undo}
            onRedo={game.redo}
            onHint={game.hint}
          />
        </div>
        {game.hintMessage ? (
          <p className="dna-hint" role="status">
            <strong>Next move</strong>
            {game.hintMessage}
          </p>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {game.announcement}
        </p>
        <nav className="game-subnav" aria-label="OneDna navigation">
          <Link href="/dna/archive">Archive</Link>
          <button type="button" onClick={() => setTutorialOpen(true)}>
            Rules
          </button>
        </nav>
      </main>
      <SiteFooter />
      <DnaTutorial
        open={tutorialOpen}
        onClose={() => {
          markDnaTutorialSeen();
          setTutorialOpen(false);
        }}
      />
      <DnaSettingsPanel
        open={settingsOpen}
        settings={game.settings}
        onChange={game.setSettings}
        onClose={() => setSettingsOpen(false)}
        onTutorial={() => {
          setSettingsOpen(false);
          setTutorialOpen(true);
        }}
        onReset={game.reset}
        onResetAll={() => {
          clearAllDnaData();
          window.location.reload();
        }}
      />
      <DnaCompletionPanel
        open={game.game.completed && completionOpen}
        game={game.game}
        stats={game.completionStats}
        bondCount={game.puzzle.bonds.length}
        onClose={() => setCompletionOpen(false)}
      />
    </div>
  );
}
