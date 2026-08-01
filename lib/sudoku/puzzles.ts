import rawBank from "./puzzle-bank.json" with { type: "json" };
import { parsePuzzleBank, validatePuzzle } from "./puzzle-validation";
import type { Difficulty, SudokuPuzzle } from "./types";

/**
 * The curated daily bank.
 *
 * Data lives in puzzle-bank.json so the generator and `npm run validate:sudoku`
 * can read exactly what ships. Each record carries its own colored-group
 * layout; a record with an empty `coloredGroups` is a traditional puzzle and
 * plays exactly as it always has.
 */

const BANK: Record<Difficulty, SudokuPuzzle[]> = parsePuzzleBank(rawBank);

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const ARCHIVE_DAYS = 28;

if (process.env.NODE_ENV !== "production") {
  const issues = DIFFICULTIES.flatMap((difficulty) =>
    BANK[difficulty].flatMap((puzzle) =>
      validatePuzzle(puzzle).map((issue) => `${puzzle.id}: ${issue}`),
    ),
  );
  if (issues.length) {
    throw new Error(`Malformed Sudoku puzzle data —\n  ${issues.join("\n  ")}`);
  }
}

function hashDate(date: string): number {
  return [...date].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 17);
}

/** Every puzzle for a difficulty — used by tests and tooling. */
export function getBank(difficulty: Difficulty): readonly SudokuPuzzle[] {
  return BANK[difficulty];
}

/** Deterministic: the same date and difficulty always resolve to the same puzzle. */
export function getDailyPuzzle(date: string, difficulty: Difficulty): SudokuPuzzle {
  const bank = BANK[difficulty];
  return bank[hashDate(`${date}-${difficulty}`) % bank.length];
}

export function getArchiveDates(today: string): string[] {
  const cursor = new Date(`${today}T12:00:00`);
  return Array.from({ length: ARCHIVE_DAYS }, (_, index) => {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() - index);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
}
