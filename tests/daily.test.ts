import { describe, expect, it } from "vitest";
import { formatLongDate, formatShortDate, getTodayKey } from "../lib/date";
import { ARCHIVE_DAYS, DIFFICULTIES, getArchiveDates, getDailyPuzzle } from "../lib/sudoku/puzzles";

describe("Daily scheduling", () => {
  it("builds a YYYY-MM-DD key from local time", () => {
    expect(getTodayKey(new Date(2026, 6, 31, 9, 30))).toBe("2026-07-31");
    expect(getTodayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("formats dates without drifting across a timezone boundary", () => {
    expect(formatLongDate("2026-07-31")).toBe("Friday, July 31, 2026");
    expect(formatShortDate("2026-01-01")).toBe("Jan 1, 2026");
  });

  it("lists the archive newest-first without gaps or repeats", () => {
    const dates = getArchiveDates("2026-03-02");
    expect(dates).toHaveLength(ARCHIVE_DAYS);
    expect(dates[0]).toBe("2026-03-02");
    expect(new Set(dates).size).toBe(ARCHIVE_DAYS);
    // Walks backwards one calendar day at a time, including across months.
    expect(dates.slice(0, 4)).toEqual(["2026-03-02", "2026-03-01", "2026-02-28", "2026-02-27"]);
  });

  it("publishes three distinct chapters for a day, stable across calls", () => {
    const boards = DIFFICULTIES.map((difficulty) => getDailyPuzzle("2026-07-31", difficulty));
    const signatures = new Set(boards.map((board) => board.join("")));
    expect(signatures.size).toBe(3);

    for (const difficulty of DIFFICULTIES) {
      expect(getDailyPuzzle("2026-07-31", difficulty)).toEqual(
        getDailyPuzzle("2026-07-31", difficulty),
      );
    }
  });

  it("varies the puzzle across the archive window", () => {
    const easy = getArchiveDates("2026-07-31").map((date) =>
      getDailyPuzzle(date, "easy").join(""),
    );
    expect(new Set(easy).size).toBeGreaterThan(1);
  });
});
