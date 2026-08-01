import { describe, expect, it } from "vitest";
import { WORD_ANSWERS } from "../lib/word/answers";
import {
  getWordArchiveDates,
  getWordPuzzle,
  isAcceptedWord,
  WORD_SCHEDULE_DAYS,
} from "../lib/word/puzzles";
import { validateWordData } from "../lib/word/validation";

describe("OneWord published data", () => {
  it("has a clean licensed schedule for at least one year", () => {
    expect(validateWordData()).toEqual([]);
    expect(WORD_SCHEDULE_DAYS).toBeGreaterThanOrEqual(365);
    expect(WORD_ANSWERS).toHaveLength(365);
  });
  it("is deterministic and unique by date", () => {
    const a = getWordPuzzle("2026-08-01"),
      b = getWordPuzzle("2026-08-02");
    expect(a).toEqual(getWordPuzzle("2026-08-01"));
    expect(a.id).not.toBe(b.id);
    expect(a.answer).not.toBe(b.answer);
  });
  it("uses a broader accepted dictionary", () => {
    expect(isAcceptedWord("crane")).toBe(true);
    expect(isAcceptedWord("zzzzz")).toBe(false);
  });
  it("publishes a newest-first archive", () => {
    const dates = getWordArchiveDates("2026-01-04");
    expect(dates).toEqual([
      "2026-01-04",
      "2026-01-03",
      "2026-01-02",
      "2026-01-01",
    ]);
  });
});
