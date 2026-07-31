"use client";

import Link from "next/link";
import { GameLogo } from "@/components/GameLogo";
import { formatShortDate } from "@/lib/date";
import type { Difficulty, GameSave, Stats } from "@/lib/sudoku/types";

function formatTime(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

interface Props {
  game: GameSave;
  difficulty: Difficulty;
  stats: Stats;
  onClose: () => void;
}

export function CompletionPanel({ game, difficulty, stats, onClose }: Props) {
  const shareText = [
    `OneSudoku · ${formatShortDate(game.date)}`,
    `${difficulty[0].toUpperCase()}${difficulty.slice(1)} · ${formatTime(game.elapsed)}`,
    `Mistakes ${game.mistakes} · Hints ${game.hints}`,
    "One good game at a time.",
  ].join("\n");

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "OneSudoku", text: shareText });
      else await navigator.clipboard.writeText(shareText);
    } catch {
      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        window.prompt("Copy your result:", shareText);
      }
    }
  };

  return (
    <div className="modal-backdrop">
      <section
        className="completion-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-title"
      >
        <button
          className="icon-button modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close completion summary"
        >
          ×
        </button>

        <GameLogo game="sudoku" size={64} decorative style={{ margin: "0 auto" }} />
        <p className="eyebrow">Today’s grid is complete</p>
        <h2 id="complete-title">Nicely done.</h2>
        <p>One puzzle down. Take that quiet focus with you.</p>

        <dl className="completion-stats">
          <div>
            <dt>Difficulty</dt>
            <dd>{difficulty}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{formatTime(game.elapsed)}</dd>
          </div>
          <div>
            <dt>Mistakes</dt>
            <dd>{game.mistakes}</dd>
          </div>
          <div>
            <dt>Hints</dt>
            <dd>{game.hints}</dd>
          </div>
          <div>
            <dt>Current streak</dt>
            <dd>
              {stats.currentStreak} {stats.currentStreak === 1 ? "day" : "days"}
            </dd>
          </div>
        </dl>

        <div className="completion-actions">
          <button className="pill-primary" type="button" onClick={share}>
            Share result
          </button>
          <Link className="pill-secondary" href="/">
            Return to OneGames
          </Link>
        </div>
      </section>
    </div>
  );
}
