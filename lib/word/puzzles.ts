import acceptedWords from "./accepted-words.json";
import { WORD_ANSWERS } from "./answers";
import type { WordPuzzle } from "./types";

export const WORD_EPOCH = "2026-01-01";
export const WORD_SCHEDULE_DAYS = WORD_ANSWERS.length;
const accepted = new Set<string>(acceptedWords);

function dayOffset(date: string): number {
  return Math.round(
    (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${WORD_EPOCH}T12:00:00Z`)) /
      86400000,
  );
}
export function isAcceptedWord(word: string): boolean {
  return accepted.has(word.toUpperCase());
}
export function getWordPuzzle(date: string): WordPuzzle {
  const offset = dayOffset(date);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    offset < 0 ||
    offset >= WORD_ANSWERS.length
  )
    throw new Error(`OneWord has no published puzzle for ${date}.`);
  return {
    id: `oneword-v1-${String(offset + 1).padStart(4, "0")}`,
    date,
    answer: WORD_ANSWERS[offset],
    number: offset + 1,
  };
}
export function getWordArchiveDates(today: string): string[] {
  const latest = Math.min(
    Math.max(dayOffset(today), 0),
    WORD_ANSWERS.length - 1,
  );
  return Array.from({ length: latest + 1 }, (_, index) => {
    const date = new Date(`${WORD_EPOCH}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + latest - index);
    return date.toISOString().slice(0, 10);
  });
}
