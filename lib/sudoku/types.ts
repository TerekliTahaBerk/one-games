export type Difficulty = "easy" | "medium" | "hard";
export type CellValue = number;
export type Board = CellValue[];
export type Notes = Record<number, number[]>;

/**
 * Semantic palette keys for colored groups. Puzzle data never carries a CSS
 * value — the key maps to a class in app/globals.css and to a player-facing
 * name in lib/sudoku/regions.ts.
 */
export type ColorGroupId = "coral" | "violet" | "mint" | "gold" | "sky";

/** A set of cells whose non-zero values must all be different. */
export interface ColoredGroup {
  id: string;
  color: ColorGroupId;
  cells: number[];
}

export interface SudokuPuzzle {
  id: string;
  difficulty: Difficulty;
  clues: Board;
  coloredGroups: ColoredGroup[];
}

/** Everything beyond the row, column and box rules that a board must satisfy. */
export interface SudokuConstraints {
  coloredGroups: readonly ColoredGroup[];
}

export type ConflictReason = "row" | "column" | "box" | "colored-group";

export interface CellConflict {
  /** A cell can break more than one rule at once. */
  reasons: ConflictReason[];
  /** Ids of the colored groups involved, when `colored-group` is one of them. */
  groupIds: string[];
}

export type ConflictMap = Map<number, CellConflict>;

export interface Snapshot {
  board: Board;
  notes: Notes;
}

/** Bumped to 2 when puzzles gained colored groups and saves gained a puzzle id. */
export const SAVE_VERSION = 2;

export interface GameSave extends Snapshot {
  version: typeof SAVE_VERSION;
  /** Ties the save to the exact puzzle definition it was played against. */
  puzzleId: string;
  date: string;
  difficulty: Difficulty;
  elapsed: number;
  started: boolean;
  completed: boolean;
  completedAt?: string;
  mistakes: number;
  hints: number;
  history: Snapshot[];
  future: Snapshot[];
}

export interface Settings {
  checkMistakes: boolean;
  highlightRelated: boolean;
  highlightMatching: boolean;
  autoRemoveNotes: boolean;
  autoCandidates: boolean;
  sound: boolean;
  reducedMotion: boolean;
}

export interface Stats {
  completedDates: string[];
  completedGames: string[];
  gamesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  bestTimes: Partial<Record<Difficulty, number>>;
  completedByDifficulty: Record<Difficulty, number>;
  totalTime: number;
  totalHints: number;
}
