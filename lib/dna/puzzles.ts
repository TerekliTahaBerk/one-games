import rawBank from "./puzzle-bank.json" with { type: "json" };
import { parsePuzzleBank, validatePuzzle } from "./puzzle-validation";
import type { DnaDifficulty, DnaPuzzle } from "./types";

const BANK = parsePuzzleBank(rawBank);
export const DNA_DIFFICULTIES: DnaDifficulty[] = ["easy", "medium", "hard"];
export const DNA_ARCHIVE_DAYS = 28;

if (process.env.NODE_ENV !== "production") {
  const issues = DNA_DIFFICULTIES.flatMap((difficulty) =>
    BANK[difficulty].flatMap((puzzle) =>
      validatePuzzle(puzzle).map((issue) => `${puzzle.id}: ${issue}`),
    ),
  );
  if (issues.length)
    throw new Error(`Malformed OneDna puzzle data —\n${issues.join("\n")}`);
}

function hash(value: string): number {
  return [...value].reduce(
    (result, character) => (result * 31 + character.charCodeAt(0)) >>> 0,
    17,
  );
}
export function getDnaBank(difficulty: DnaDifficulty): readonly DnaPuzzle[] {
  return BANK[difficulty];
}
export function getDailyDnaPuzzle(
  date: string,
  difficulty: DnaDifficulty,
): DnaPuzzle {
  const bank = BANK[difficulty];
  return bank[hash(`${date}-${difficulty}`) % bank.length];
}
export function getDnaArchiveDates(today: string): string[] {
  const cursor = new Date(`${today}T12:00:00`);
  return Array.from({ length: DNA_ARCHIVE_DAYS }, (_, index) => {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() - index);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
}
