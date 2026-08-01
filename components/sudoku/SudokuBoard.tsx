"use client";

import { useMemo, type KeyboardEvent } from "react";
import { getAllPeers, indexGroups } from "@/lib/sudoku/constraints";
import { regionClass, regionName, REGION_STYLES } from "@/lib/sudoku/regions";
import type {
  Board,
  ColoredGroup,
  ConflictMap,
  Notes,
  Settings,
} from "@/lib/sudoku/types";

interface Props {
  board: Board;
  clues: Board;
  notes: Notes;
  selected: number | null;
  conflicts: ConflictMap;
  coloredGroups: readonly ColoredGroup[];
  settings: Settings;
  /** Index of the cell just filled correctly, for a one-off entry flash. */
  lastEntry: number | null;
  completed: boolean;
  onSelect: (index: number) => void;
  onEnter: (value: number) => void;
  onErase: () => void;
}

export function SudokuBoard({
  board,
  clues,
  notes,
  selected,
  conflicts,
  coloredGroups,
  settings,
  lastEntry,
  completed,
  onSelect,
  onEnter,
  onErase,
}: Props) {
  const selectedValue = selected === null ? 0 : board[selected];
  // Related highlighting follows the full peer model, so the colored group a
  // cell belongs to lights up alongside its row, column and box.
  const related = useMemo(
    () => (selected === null ? new Set<number>() : new Set(getAllPeers(selected, coloredGroups))),
    [selected, coloredGroups],
  );
  const groupByCell = useMemo(() => indexGroups(coloredGroups), [coloredGroups]);

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
      className={`sudoku-board${completed ? " is-complete" : ""}`}
      role="grid"
      aria-label="Sudoku puzzle"
      onKeyDown={onKeyDown}
      data-testid="sudoku-board"
    >
      {board.map((value, index) => {
        const row = Math.floor(index / 9) + 1;
        const column = (index % 9) + 1;
        const cellNotes = notes[index] ?? [];
        const group = groupByCell.get(index) ?? null;
        const conflict = conflicts.get(index);
        const isSelected = index === selected;
        const isRelated = settings.highlightRelated && !isSelected && related.has(index);
        const isMatching = settings.highlightMatching && Boolean(value) && value === selectedValue;
        const isColorConflict = Boolean(conflict?.reasons.includes("colored-group"));

        const classes = [
          "sudoku-cell",
          clues[index] ? "is-clue" : "is-entry",
          group ? `has-region ${regionClass(group.color)}` : "",
          isSelected ? "is-selected" : "",
          isRelated ? "is-related" : "",
          isMatching ? "is-matching" : "",
          conflict ? "is-conflict" : "",
          isColorConflict ? "is-region-conflict" : "",
          lastEntry === index ? "is-fresh" : "",
          column % 3 === 0 && column !== 9 ? "block-right" : "",
          row % 3 === 0 && row !== 9 ? "block-bottom" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const noteText = cellNotes.length ? `, candidates ${cellNotes.join(" and ")}` : "";
        const groupLabel = group ? regionName(group.color) : "";
        const label = [
          `Row ${row}, column ${column}`,
          value ? `value ${value}` : `empty${noteText}`,
          clues[index] ? "given" : "",
          groupLabel ? `${groupLabel} group` : "",
          isColorConflict ? `repeats a number in the ${groupLabel} group` : "",
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <button
            key={index}
            type="button"
            role="gridcell"
            tabIndex={isSelected || (selected === null && index === 0) ? 0 : -1}
            aria-selected={isSelected}
            aria-invalid={Boolean(conflict)}
            aria-label={label}
            className={classes}
            onClick={() => onSelect(index)}
            data-cell={index}
            data-region={group?.color}
          >
            {group && (
              <span
                className="region-mark"
                data-marker={REGION_STYLES[group.color].marker}
                aria-hidden="true"
              />
            )}
            {value ? (
              <span className="cell-value">{value}</span>
            ) : (
              <span className="candidate-grid" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((candidate) => (
                  <i key={candidate}>{cellNotes.includes(candidate) ? candidate : ""}</i>
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
