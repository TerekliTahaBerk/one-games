import { describe, expect, it } from "vitest";
import {
  candidatesFor,
  conflictIndices,
  hasUniqueSolution,
  isComplete,
  isValidBoard,
  parsePuzzle,
  solve,
} from "../lib/sudoku/solver";
import { DIFFICULTIES, getDailyPuzzle } from "../lib/sudoku/puzzles";

const puzzle = parsePuzzle("530070000600195000098000060800060003400803001700020006060000280000419005000080079");

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

  it("confirms all curated daily puzzles have one solution", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const date of ["2026-07-30", "2026-08-01", "2026-11-17", "2027-01-03"]) {
        expect(hasUniqueSolution(getDailyPuzzle(date, difficulty))).toBe(true);
      }
    }
  });
});
