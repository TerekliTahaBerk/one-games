import { describe, expect, it } from "vitest";
import {
  complement,
  pairFamily,
  orthogonalNeighbors,
  findConflicts,
  candidatesFor,
  isSolved,
} from "../lib/dna/rules";
import { countSolutions } from "../lib/dna/solver";
import {
  nextLogicalDeduction,
  solveLogically,
} from "../lib/dna/logical-solver";
import { getDailyDnaPuzzle, getDnaBank } from "../lib/dna/puzzles";
import { validatePuzzle } from "../lib/dna/puzzle-validation";
import type { DnaBoard, DnaPuzzle } from "../lib/dna/types";

const easy = getDailyDnaPuzzle("2026-08-01", "easy");

describe("OneDNA rules", () => {
  it("maps complements and pair families", () => {
    expect([
      complement("A"),
      complement("T"),
      complement("C"),
      complement("G"),
    ]).toEqual(["T", "A", "G", "C"]);
    expect(pairFamily("A")).toBe("AT");
    expect(pairFamily("G")).toBe("CG");
  });
  it("calculates orthogonal neighbors without diagonals", () => {
    expect(orthogonalNeighbors(6, 7).sort((a, b) => a - b)).toEqual([
      1, 6, 8, 13,
    ]);
    expect(orthogonalNeighbors(6, 0)).toEqual([6, 1]);
  });
  it("marks identical orthogonal neighbors but permits diagonal equality", () => {
    const board: DnaBoard = Array(36).fill(null);
    board[0] = "A";
    board[1] = "A";
    expect(
      findConflicts(board, { size: 6, bonds: [] }).get(0)?.reasons,
    ).toContain("identical-neighbor");
    board[1] = null;
    board[7] = "A";
    expect(findConflicts(board, { size: 6, bonds: [] }).size).toBe(0);
  });
  it("marks both endpoints of a broken complement bond", () => {
    const board: DnaBoard = Array(36).fill(null);
    board[0] = "A";
    board[8] = "G";
    const conflicts = findConflicts(board, {
      size: 6,
      bonds: [{ id: "1", a: 0, b: 8, kind: "complement" }],
    });
    expect(conflicts.get(0)?.reasons).toContain("bond-complement");
    expect(conflicts.get(8)?.reasons).toContain("bond-complement");
  });
  it("detects a partial family overfill and completed missing base", () => {
    const over: DnaBoard = Array(36).fill(null);
    over.splice(0, 4, "A", "T", "A", "T");
    expect(findConflicts(over, { size: 6, bonds: [] }).size).toBeGreaterThan(0);
    const missing: DnaBoard = Array(36).fill(null);
    missing.splice(0, 6, "A", "C", "G", "A", "C", "A");
    expect(
      findConflicts(missing, { size: 6, bonds: [] }).get(0)?.reasons,
    ).toContain("missing-base");
  });
  it("calculates candidates through the central engine", () => {
    const board = [...easy.clues];
    const index = board.findIndex((cell) => !cell);
    expect(candidatesFor(board, easy, index)).toContain(easy.solution[index]);
  });
  it("requires every launch rule for completion", () => {
    expect(isSolved([...easy.solution], easy)).toBe(true);
    const broken = [...easy.solution];
    broken[1] = broken[0];
    expect(isSolved(broken, easy)).toBe(false);
  });
});

describe("OneDNA solvers and bank", () => {
  it("finds exactly one exact solution for a production puzzle", () => {
    const result = countSolutions([...easy.clues], easy, 2);
    expect(result.count).toBe(1);
    expect(result.first).toEqual(easy.solution);
  });
  it("detects no solution and multiple solutions", () => {
    const invalid = [...easy.clues];
    const given = invalid.findIndex(Boolean);
    const peer = orthogonalNeighbors(easy.size, given).find(
      (index) => !invalid[index],
    );
    if (peer === undefined) throw new Error("fixture has no open peer");
    invalid[peer] = invalid[given];
    expect(countSolutions(invalid, easy, 2).count).toBe(0);
    const blank: DnaBoard = Array(16).fill(null);
    expect(countSolutions(blank, { size: 4, bonds: [] }, 2).count).toBe(2);
  });
  it("returns structured explanatory deductions", () => {
    const deduction = nextLogicalDeduction([...easy.clues], easy);
    expect(deduction?.targetCells).toHaveLength(1);
    expect(deduction?.explanation.length).toBeGreaterThan(20);
    expect(deduction?.weight).toBeGreaterThan(0);
  });
  it("solves every production puzzle logically without guessing", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const)
      for (const puzzle of getDnaBank(difficulty)) {
        const result = solveLogically([...puzzle.clues], puzzle);
        expect(result.solved, puzzle.id).toBe(true);
        expect(result.board, puzzle.id).toEqual(puzzle.solution);
      }
  }, 20_000);
  it("has 400 valid, uniquely identified puzzles per difficulty", () => {
    const ids = new Set<string>();
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const bank = getDnaBank(difficulty);
      expect(bank).toHaveLength(400);
      for (const puzzle of bank) {
        expect(validatePuzzle(puzzle), puzzle.id).toEqual([]);
        expect(ids.has(puzzle.id)).toBe(false);
        ids.add(puzzle.id);
      }
    }
  });
  it("selects the same date deterministically", () => {
    expect(getDailyDnaPuzzle("2026-09-17", "hard").id).toBe(
      getDailyDnaPuzzle("2026-09-17", "hard").id,
    );
  });
  it("rejects malformed bonds", () => {
    const malformed: DnaPuzzle = {
      ...easy,
      bonds: [{ id: "bad", a: 1, b: 1, kind: "complement" }],
    };
    expect(validatePuzzle(malformed).join(" ")).toMatch(
      /invalid endpoints|too short/,
    );
  });
});
