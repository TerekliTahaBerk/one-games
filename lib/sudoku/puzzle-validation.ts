import { CELL_COUNT } from "./constraints";
import type { ColorGroupId, ColoredGroup, Difficulty, SudokuPuzzle } from "./types";

/**
 * Runtime guards for puzzle data.
 *
 * `parsePuzzleBank` turns the JSON bank into strongly typed puzzles without a
 * type assertion — anything malformed throws at load rather than surfacing as a
 * broken grid. `validatePuzzle` collects the deeper design rules and is used by
 * the development check in puzzles.ts and by the test suite.
 */

export const COLOR_GROUP_IDS: readonly ColorGroupId[] = [
  "coral",
  "violet",
  "mint",
  "gold",
  "sky",
];

export const DIFFICULTY_KEYS: readonly Difficulty[] = ["easy", "medium", "hard"];

function isColorGroupId(value: unknown): value is ColorGroupId {
  return typeof value === "string" && COLOR_GROUP_IDS.includes(value as ColorGroupId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Design-level checks. Returns readable problems; an empty list means the
 * puzzle is safe to ship. Solvability is verified by the puzzle-bank tests and
 * by `npm run validate:sudoku`, which have the budget for a full search.
 */
export function validateColoredGroups(clues: readonly number[], groups: ColoredGroup[]): string[] {
  const issues: string[] = [];
  const owner = new Map<number, string>();
  const ids = new Set<string>();

  for (const group of groups) {
    if (ids.has(group.id)) issues.push(`duplicate group id "${group.id}"`);
    ids.add(group.id);

    if (group.cells.length < 2) {
      issues.push(`group "${group.id}" needs at least two cells`);
      continue;
    }

    const seen = new Set<number>();
    for (const cell of group.cells) {
      if (!Number.isInteger(cell) || cell < 0 || cell >= CELL_COUNT) {
        issues.push(`group "${group.id}" has an out-of-range cell ${cell}`);
        continue;
      }
      if (seen.has(cell)) {
        // Already reported as an in-group repeat; don't also call it an overlap.
        issues.push(`group "${group.id}" repeats cell ${cell}`);
        continue;
      }
      seen.add(cell);

      const existing = owner.get(cell);
      if (existing !== undefined) {
        issues.push(`cell ${cell} belongs to both "${existing}" and "${group.id}"`);
      } else {
        owner.set(cell, group.id);
      }
    }

    const given = group.cells.map((cell) => clues[cell]).filter(Boolean);
    if (new Set(given).size !== given.length) {
      issues.push(`group "${group.id}" already repeats a given clue value`);
    }
  }

  return issues;
}

export function validatePuzzle(puzzle: SudokuPuzzle): string[] {
  const issues: string[] = [];
  if (!puzzle.id) issues.push("puzzle is missing an id");
  if (puzzle.clues.length !== CELL_COUNT) issues.push("puzzle must have 81 cells");
  return [...issues, ...validateColoredGroups(puzzle.clues, puzzle.coloredGroups)];
}

function parseClues(value: unknown, label: string): number[] {
  if (typeof value !== "string" || !/^[0-9]{81}$/.test(value)) {
    throw new Error(`${label}: clues must be a string of 81 digits`);
  }
  return [...value].map(Number);
}

function parseGroup(value: unknown, label: string): ColoredGroup {
  if (!isRecord(value)) throw new Error(`${label}: colored group must be an object`);
  const { id, color, cells } = value;
  if (typeof id !== "string" || !id) throw new Error(`${label}: colored group needs an id`);
  if (!isColorGroupId(color)) {
    throw new Error(`${label}/${id}: "${String(color)}" is not a known palette key`);
  }
  if (!Array.isArray(cells) || cells.some((cell) => typeof cell !== "number")) {
    throw new Error(`${label}/${id}: cells must be an array of numbers`);
  }
  return { id, color, cells: cells.filter((cell): cell is number => typeof cell === "number") };
}

function parsePuzzle(value: unknown, difficulty: Difficulty, position: number): SudokuPuzzle {
  const label = `${difficulty}[${position}]`;
  if (!isRecord(value)) throw new Error(`${label}: puzzle must be an object`);
  const { id, clues, coloredGroups } = value;
  if (typeof id !== "string" || !id) throw new Error(`${label}: puzzle needs an id`);
  if (coloredGroups !== undefined && !Array.isArray(coloredGroups)) {
    throw new Error(`${id}: coloredGroups must be an array`);
  }
  return {
    id,
    difficulty,
    clues: parseClues(clues, id),
    coloredGroups: (coloredGroups ?? []).map((group) => parseGroup(group, id)),
  };
}

/** Reads the JSON bank into typed puzzles, throwing on anything malformed. */
export function parsePuzzleBank(raw: unknown): Record<Difficulty, SudokuPuzzle[]> {
  if (!isRecord(raw)) throw new Error("Puzzle bank must be an object");
  const entries = DIFFICULTY_KEYS.map((difficulty): [Difficulty, SudokuPuzzle[]] => {
    const records = raw[difficulty];
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error(`Puzzle bank has no ${difficulty} puzzles`);
    }
    return [difficulty, records.map((record, position) => parsePuzzle(record, difficulty, position))];
  });
  return {
    easy: entries[0][1],
    medium: entries[1][1],
    hard: entries[2][1],
  };
}
