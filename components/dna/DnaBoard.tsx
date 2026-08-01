"use client";

import { useEffect, useRef } from "react";
import { bondedNeighbor, pairFamily } from "@/lib/dna/rules";
import type {
  DnaBase,
  DnaBoard as Board,
  DnaBond,
  DnaConflictMap,
  DnaSize,
} from "@/lib/dna/types";

interface Props {
  board: Board;
  clues: Board;
  size: DnaSize;
  bonds: DnaBond[];
  selected: number | null;
  conflicts: DnaConflictMap;
  hintCells: number[];
  locked: boolean;
  highlightRelated: boolean;
  highlightBonded: boolean;
  onSelect(index: number): void;
  onEnter(base: DnaBase): void;
  onErase(): void;
}

export function DnaBoard({
  board,
  clues,
  size,
  bonds,
  selected,
  conflicts,
  hintCells,
  locked,
  highlightRelated,
  highlightBonded,
  onSelect,
  onEnter,
  onErase,
}: Props) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const partner =
    selected === null ? null : (bondedNeighbor(selected, bonds)?.index ?? null);
  useEffect(() => {
    if (selected !== null) refs.current[selected]?.focus();
  }, [selected]);
  const move = (index: number, key: string) => {
    const row = Math.floor(index / size),
      column = index % size;
    if (key === "ArrowLeft") return row * size + ((column + size - 1) % size);
    if (key === "ArrowRight") return row * size + ((column + 1) % size);
    if (key === "ArrowUp") return ((row + size - 1) % size) * size + column;
    if (key === "ArrowDown") return ((row + 1) % size) * size + column;
    if (key === "Home") return row * size;
    if (key === "End") return row * size + size - 1;
    return null;
  };
  return (
    <div className="dna-board-wrap">
      <div
        className={`dna-board size-${size}`}
        role="grid"
        aria-label={`${size} by ${size} OneDNA board`}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        <svg
          className="dna-bonds"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {bonds.map((bond, order) => {
            const ax = (((bond.a % size) + 0.5) / size) * 100,
              ay = ((Math.floor(bond.a / size) + 0.5) / size) * 100,
              bx = (((bond.b % size) + 0.5) / size) * 100,
              by = ((Math.floor(bond.b / size) + 0.5) / size) * 100;
            const mx = (ax + bx) / 2,
              my = (ay + by) / 2,
              length = Math.hypot(bx - ax, by - ay) || 1,
              bend = (order % 2 ? -1 : 1) * Math.min(7, length * 0.13),
              cx = mx - ((by - ay) / length) * bend,
              cy = my + ((bx - ax) / length) * bend;
            const violated = conflicts.get(bond.a)?.bondIds.includes(bond.id);
            return (
              <path
                key={bond.id}
                className={
                  violated
                    ? "is-violated"
                    : board[bond.a] && board[bond.b]
                      ? "is-satisfied"
                      : ""
                }
                d={`M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`}
              />
            );
          })}
        </svg>
        {board.map((value, index) => {
          const row = Math.floor(index / size),
            column = index % size,
            bond = bondedNeighbor(index, bonds),
            conflict = conflicts.get(index);
          const related =
            selected !== null &&
            highlightRelated &&
            (Math.floor(selected / size) === row || selected % size === column);
          const label = `Row ${row + 1}, column ${column + 1}, ${value ?? "empty"}, ${clues[index] ? "given" : "editable"}${bond ? `, bond ${bond.id} with row ${Math.floor(bond.index / size) + 1}, column ${(bond.index % size) + 1}. Bonded cells must be complementary` : ""}${conflict ? `, conflict: ${conflict.reasons.join(", ")}` : ""}`;
          return (
            <button
              key={index}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="gridcell"
              data-cell={index}
              className={`dna-cell${clues[index] ? " is-given" : ""}${selected === index ? " is-selected" : ""}${related ? " is-related" : ""}${partner === index && highlightBonded ? " is-partner" : ""}${conflict ? " is-conflict" : ""}${hintCells.includes(index) ? " is-hint" : ""}${value ? ` family-${pairFamily(value).toLowerCase()} strand-${value === "A" || value === "C" ? "upper" : "lower"}` : ""}`}
              aria-label={label}
              aria-selected={selected === index}
              aria-invalid={conflict ? true : undefined}
              tabIndex={
                selected === index || (selected === null && index === 0)
                  ? 0
                  : -1
              }
              disabled={locked}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => {
                const target = move(index, event.key);
                if (target !== null) {
                  event.preventDefault();
                  onSelect(target);
                  return;
                }
                const key = event.key.toUpperCase();
                if (key === "A" || key === "T" || key === "C" || key === "G") {
                  event.preventDefault();
                  onEnter(key);
                } else if (
                  event.key === "Backspace" ||
                  event.key === "Delete"
                ) {
                  event.preventDefault();
                  onErase();
                }
              }}
            >
              {value ? (
                <span className="dna-base">
                  <i aria-hidden="true" />
                  {value}
                </span>
              ) : (
                <span aria-hidden="true" className="dna-empty">
                  ·
                </span>
              )}
              {bond ? (
                <span className="dna-bond-badge" aria-hidden="true">
                  {bond.id}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
