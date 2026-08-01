import { describe, expect, it } from "vitest";
import {
  candidatesFor,
  conflictDetails,
  conflictIndices,
  getAllPeers,
  getColoredPeers,
  getStandardPeers,
  hasUniqueSolution,
  isComplete,
  isValidBoard,
  parsePuzzle,
  solve,
} from "../lib/sudoku/solver";
import { DIFFICULTIES, getBank, getDailyPuzzle } from "../lib/sudoku/puzzles";
import { validateColoredGroups } from "../lib/sudoku/puzzle-validation";
import type { ColoredGroup } from "../lib/sudoku/types";

const puzzle = parsePuzzle(
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
);

describe("Sudoku domain logic", () => {
  it("validates board shape and values", () => {
    expect(isValidBoard(puzzle)).toBe(true);
    expect(isValidBoard([1, 2, 3])).toBe(false);
    expect(isValidBoard([...puzzle.slice(0, 80), 10])).toBe(false);
  });

  it("computes candidates for an empty cell", () => {
    expect(candidatesFor(puzzle, 2)).toEqual([1, 2, 4]);
    expect(candidatesFor(puzzle, 0)).toEqual([]);
  });

  it("solves a valid puzzle and confirms completion", () => {
    const solution = solve(puzzle);
    expect(solution).not.toBeNull();
    expect(isComplete(solution!)).toBe(true);
  });

  it("detects conflicts", () => {
    const invalid = [...puzzle];
    invalid[2] = 5;
    expect(conflictIndices(invalid).has(0)).toBe(true);
    expect(solve(invalid)).toBeNull();
  });

  it("names the rule a standard conflict breaks", () => {
    const invalid = [...puzzle];
    invalid[2] = 5; // same row and same box as the 5 in cell 0
    const detail = conflictDetails(invalid).get(0);
    expect(detail?.reasons).toContain("row");
    expect(detail?.reasons).toContain("box");
    expect(detail?.reasons).not.toContain("colored-group");
    expect(detail?.groupIds).toEqual([]);
  });

  it("confirms all curated daily puzzles have one solution", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const date of ["2026-07-30", "2026-08-01", "2026-11-17", "2027-01-03"]) {
        const daily = getDailyPuzzle(date, difficulty);
        expect(hasUniqueSolution(daily.clues, daily.coloredGroups)).toBe(true);
      }
    }
  });
});

describe("Colored groups", () => {
  // Constellations: no two cells share a row, a column or a box, so anything
  // these tests observe can only come from the colored rule.
  const coral: ColoredGroup = { id: "coral", color: "coral", cells: [0, 31, 43, 62] };
  const mint: ColoredGroup = { id: "mint", color: "mint", cells: [5, 24, 70] };
  const groups = [coral, mint];

  it("reports the other cells in the same colored group", () => {
    expect(getColoredPeers(31, groups).sort((a, b) => a - b)).toEqual([0, 43, 62]);
    expect(getColoredPeers(5, groups).sort((a, b) => a - b)).toEqual([24, 70]);
    // A cell outside every group has no colored peers.
    expect(getColoredPeers(8, groups)).toEqual([]);
    expect(getColoredPeers(31, [])).toEqual([]);
  });

  it("adds colored peers to the standard neighbourhood without losing any", () => {
    const all = getAllPeers(31, groups);
    for (const peer of getStandardPeers(31)) expect(all).toContain(peer);
    expect(all).toContain(0); // colored-only peer: different row, column and box
    expect(all).not.toContain(31);
    expect(new Set(all).size).toBe(all.length);
    expect(getAllPeers(8, groups)).toEqual(getStandardPeers(8));
  });

  it("excludes values already used by a same-colored cell", () => {
    const board = new Array(81).fill(0);
    board[62] = 7; // colored peer of 0, but not a row, column or box peer
    expect(getStandardPeers(0)).not.toContain(62);
    expect(candidatesFor(board, 0)).toContain(7);
    expect(candidatesFor(board, 0, groups)).not.toContain(7);
  });

  it("flags both cells of a duplicate inside a colored group", () => {
    const board = new Array(81).fill(0);
    board[0] = 5;
    board[43] = 5;
    const detail = conflictDetails(board, groups);
    expect(detail.get(0)?.reasons).toEqual(["colored-group"]);
    expect(detail.get(43)?.reasons).toEqual(["colored-group"]);
    expect(detail.get(0)?.groupIds).toEqual(["coral"]);
    // Without the groups the very same board is perfectly legal.
    expect(conflictIndices(board).size).toBe(0);
  });

  it("still allows the same number in two differently colored groups", () => {
    const board = new Array(81).fill(0);
    board[0] = 5; // coral
    board[24] = 5; // mint, and no shared row, column or box with cell 0
    expect(conflictIndices(board, groups).size).toBe(0);
  });

  it("never returns a solution that repeats a value inside a group", () => {
    const daily = getDailyPuzzle("2026-08-01", "hard");
    const solution = solve(daily.clues, daily.coloredGroups);
    expect(solution).not.toBeNull();
    for (const group of daily.coloredGroups) {
      const values = group.cells.map((cell) => solution![cell]);
      expect(new Set(values).size, group.id).toBe(values.length);
    }
    expect(conflictIndices(solution!, daily.coloredGroups).size).toBe(0);
  });

  it("refuses to call a full board complete when only a colored group repeats", () => {
    const solution = solve(puzzle);
    expect(solution).not.toBeNull();
    expect(isComplete(solution!)).toBe(true);

    // Colour two cells that already share a value but no row, column or box:
    // the grid stays a flawless Sudoku, yet the colored rule is broken.
    const first = 0;
    const second = solution!.findIndex(
      (value, index) =>
        index !== first &&
        value === solution![first] &&
        !getStandardPeers(first).includes(index),
    );
    expect(second).toBeGreaterThan(-1);
    const clash: ColoredGroup[] = [{ id: "sky", color: "sky", cells: [first, second] }];

    expect(isComplete(solution!, clash)).toBe(false);
    expect(conflictDetails(solution!, clash).get(first)?.reasons).toEqual(["colored-group"]);
  });

  it("rejects given clues that already break a colored group", () => {
    const clues = new Array(81).fill(0);
    clues[0] = 4;
    clues[62] = 4;
    expect(validateColoredGroups(clues, [coral])).toEqual([
      'group "coral" already repeats a given clue value',
    ]);
    expect(validateColoredGroups(new Array(81).fill(0), [coral])).toEqual([]);
  });

  it("rejects a cell that belongs to two groups", () => {
    const overlapping: ColoredGroup[] = [
      { id: "coral", color: "coral", cells: [0, 10] },
      { id: "sky", color: "sky", cells: [10, 20] },
    ];
    expect(validateColoredGroups(new Array(81).fill(0), overlapping)).toEqual([
      'cell 10 belongs to both "coral" and "sky"',
    ]);
  });

  it("rejects malformed group definitions", () => {
    const board = new Array(81).fill(0);
    expect(validateColoredGroups(board, [{ id: "coral", color: "coral", cells: [3] }])).toEqual([
      'group "coral" needs at least two cells',
    ]);
    expect(
      validateColoredGroups(board, [{ id: "coral", color: "coral", cells: [3, 81] }]),
    ).toEqual(['group "coral" has an out-of-range cell 81']);
    expect(
      validateColoredGroups(board, [{ id: "coral", color: "coral", cells: [3, 3, 12] }]),
    ).toEqual(['group "coral" repeats cell 3']);
  });

  it("leaves a traditional puzzle behaving exactly as before", () => {
    const board = [...puzzle];
    expect(candidatesFor(board, 2, [])).toEqual(candidatesFor(board, 2));
    expect(getAllPeers(2, [])).toEqual(getStandardPeers(2));
    expect(conflictIndices(board, []).size).toBe(conflictIndices(board).size);
    expect(solve(board, [])).toEqual(solve(board));
  });
});

describe("Curated puzzle bank", () => {
  const banks = DIFFICULTIES.map((difficulty) => ({
    difficulty,
    puzzles: getBank(difficulty),
  }));

  it("ships every difficulty with a stocked bank", () => {
    for (const { difficulty, puzzles } of banks) {
      expect(puzzles.length, difficulty).toBeGreaterThanOrEqual(8);
    }
  });

  it("gives every single puzzle exactly one solution under both rule sets", () => {
    for (const { difficulty, puzzles } of banks) {
      for (const puzzle of puzzles) {
        expect(hasUniqueSolution(puzzle.clues), `${difficulty} ${puzzle.id}`).toBe(true);
        expect(
          hasUniqueSolution(puzzle.clues, puzzle.coloredGroups),
          `${difficulty} ${puzzle.id} with colored groups`,
        ).toBe(true);
      }
    }
  });

  it("ships well-formed colored layouts", () => {
    const expected = { easy: [3, 4], medium: [4, 5], hard: [4, 6] } as const;
    for (const { difficulty, puzzles } of banks) {
      const [low, high] = expected[difficulty];
      for (const puzzle of puzzles) {
        expect(validateColoredGroups(puzzle.clues, puzzle.coloredGroups), puzzle.id).toEqual([]);
        expect(puzzle.coloredGroups.length, puzzle.id).toBeGreaterThanOrEqual(2);
        let colored = 0;
        for (const group of puzzle.coloredGroups) {
          expect(group.cells.length, `${puzzle.id}/${group.id}`).toBeGreaterThanOrEqual(low);
          expect(group.cells.length, `${puzzle.id}/${group.id}`).toBeLessThanOrEqual(high);
          colored += group.cells.length;
        }
        // Never so much colour that the board stops reading as a Sudoku grid.
        expect(colored, puzzle.id).toBeLessThanOrEqual(32);
      }
    }
  });

  it("never reuses a grid or an id within or across difficulties", () => {
    const all = banks.flatMap(({ puzzles }) => puzzles);
    expect(new Set(all.map((puzzle) => puzzle.clues.join(""))).size).toBe(all.length);
    expect(new Set(all.map((puzzle) => puzzle.id)).size).toBe(all.length);
  });

  it("gives fewer clues as difficulty rises", () => {
    const clues = Object.fromEntries(
      banks.map(({ difficulty, puzzles }) => [
        difficulty,
        puzzles.map((puzzle) => puzzle.clues.filter(Boolean).length),
      ]),
    );
    // Every easy grid must start with more clues than every medium grid, and
    // likewise medium over hard — otherwise the tabs are difficulty in name only.
    expect(Math.min(...clues.easy)).toBeGreaterThan(Math.max(...clues.medium));
    expect(Math.min(...clues.medium)).toBeGreaterThan(Math.max(...clues.hard));
  });

  it("serves three different grids on the same day", () => {
    for (const date of ["2026-07-31", "2026-08-14", "2027-02-02", "2027-11-09"]) {
      const boards = DIFFICULTIES.map((difficulty) =>
        getDailyPuzzle(date, difficulty).clues.join(""),
      );
      expect(new Set(boards).size, date).toBe(3);
    }
  });
});
