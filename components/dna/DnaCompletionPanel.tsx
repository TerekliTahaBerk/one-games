"use client";

import { formatLongDate } from "@/lib/date";
import type { DnaGameSave, DnaStats } from "@/lib/dna/types";
import { useModalFocus } from "./useModalFocus";

const time = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export function DnaCompletionPanel({
  open,
  game,
  stats,
  bondCount,
  onClose,
}: {
  open: boolean;
  game: DnaGameSave;
  stats: DnaStats | null;
  bondCount: number;
  onClose(): void;
}) {
  const modalRef = useModalFocus(open, onClose);
  if (!open) return null;
  const share = `OneDna ${game.date}\n${game.difficulty[0].toUpperCase()}${game.difficulty.slice(1)} · ${game.size}×${game.size} · ${time(game.elapsed)}\n${"◇".repeat(bondCount)} · ${game.mistakes} mistake${game.mistakes === 1 ? "" : "s"} · ${game.hints} hint${game.hints === 1 ? "" : "s"}`;
  return (
    <div className="modal-backdrop">
      <section
        ref={modalRef}
        className="dna-modal completion-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Puzzle completed"
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close completion summary"
        >
          ×
        </button>
        <span className="caption">{formatLongDate(game.date)}</span>
        <h2>Beautifully paired.</h2>
        <div className="completion-grid">
          <span>
            Difficulty<strong>{game.difficulty}</strong>
          </span>
          <span>
            Board
            <strong>
              {game.size}×{game.size}
            </strong>
          </span>
          <span>
            Time<strong>{time(game.elapsed)}</strong>
          </span>
          <span>
            Mistakes<strong>{game.mistakes}</strong>
          </span>
          <span>
            Hints<strong>{game.hints}</strong>
          </span>
          <span>
            Streak<strong>{stats?.currentStreak ?? 1}</strong>
          </span>
        </div>
        <button
          className="pill-primary"
          type="button"
          onClick={() => void navigator.clipboard.writeText(share)}
        >
          Share result
        </button>
        <p className="note">The shared result never includes the letters.</p>
      </section>
    </div>
  );
}
