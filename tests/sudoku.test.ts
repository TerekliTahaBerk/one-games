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
import { DIFFICULTIES, getBank, getDailyPuzzle } from "../lib/sudoku/puzzles";

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

  it("gives every single puzzle exactly one solution", () => {
    for (const { difficulty, puzzles } of banks) {
      for (const puzzle of puzzles) {
        expect(hasUniqueSolution(parsePuzzle(puzzle)), `${difficulty} ${puzzle}`).toBe(true);
      }
    }
  });

  it("never reuses a grid within or across difficulties", () => {
    const all = banks.flatMap(({ puzzles }) => puzzles);
    expect(new Set(all).size).toBe(all.length);
  });

  it("gives fewer clues as difficulty rises", () => {
    const clues = Object.fromEntries(
      banks.map(({ difficulty, puzzles }) => [
        difficulty,
        puzzles.map((puzzle) => 81 - (puzzle.match(/0/g)?.length ?? 0)),
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
        getDailyPuzzle(date, difficulty).join(""),
      );
      expect(new Set(boards).size, date).toBe(3);
    }
  });
});
