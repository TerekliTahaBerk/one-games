"use client";

import type { KeyboardEvent } from "react";
import { peers } from "@/lib/sudoku/solver";
import type { Board, Notes, Settings } from "@/lib/sudoku/types";

interface Props {
  board: Board;
  clues: Board;
  notes: Notes;
  selected: number | null;
  conflicts: Set<number>;
  settings: Settings;
  onSelect: (index: number) => void;
  onEnter: (value: number) => void;
  onErase: () => void;
}

export function SudokuBoard({
  board, clues, notes, selected, conflicts, settings, onSelect, onEnter, onErase,
}: Props) {
  const selectedValue = selected === null ? 0 : board[selected];
  const related = selected === null ? [] : peers(selected);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (selected === null) return;
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      onEnter(Number(event.key));
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      onErase();
      return;
    }
    const moves: Record<string, number> = {
      ArrowLeft: selected % 9 === 0 ? 8 : -1,
      ArrowRight: selected % 9 === 8 ? -8 : 1,
      ArrowUp: selected < 9 ? 72 : -9,
      ArrowDown: selected > 71 ? -72 : 9,
    };
    if (event.key in moves) {
      event.preventDefault();
      onSelect(selected + moves[event.key]);
    }
  };

  return (
    <div
      className="sudoku-board"
      role="grid"
      aria-label="Sudoku puzzle"
      onKeyDown={onKeyDown}
      data-testid="sudoku-board"
    >
      {board.map((value, index) => {
        const row = Math.floor(index / 9) + 1;
        const column = (index % 9) + 1;
        const cellNotes = notes[index] ?? [];
        const isSelected = index === selected;
        const isRelated = settings.highlightRelated && related.includes(index);
        const isMatching = settings.highlightMatching && Boolean(value) && value === selectedValue;
        const classes = [
          "sudoku-cell",
          clues[index] ? "is-clue" : "is-entry",
          isSelected ? "is-selected" : "",
          isRelated ? "is-related" : "",
          isMatching ? "is-matching" : "",
          conflicts.has(index) ? "is-conflict" : "",
          column % 3 === 0 && column !== 9 ? "block-right" : "",
          row % 3 === 0 && row !== 9 ? "block-bottom" : "",
        ].filter(Boolean).join(" ");
        const noteText = cellNotes.length ? `, candidates ${cellNotes.join(" and ")}` : "";
        return (
          <button
            key={index}
            type="button"
            role="gridcell"
            tabIndex={isSelected || (selected === null && index === 0) ? 0 : -1}
            aria-selected={isSelected}
            aria-invalid={conflicts.has(index)}
            aria-label={`Row ${row}, column ${column}, ${value ? `value ${value}` : `empty${noteText}`}${clues[index] ? ", given" : ""}`}
            className={classes}
            onClick={() => onSelect(index)}
            data-cell={index}
          >
            {value ? <span className="cell-value">{value}</span> : (
              <span className="candidate-grid" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((candidate) => (
                  <i key={candidate}>{cellNotes.includes(candidate) ? candidate : ""}</i>
                ))}
              </span>
            )}
            {conflicts.has(index) && <span className="conflict-mark" aria-hidden="true">!</span>}
          </button>
        );
      })}
    </div>
  );
}
