import {
  bondedNeighbor,
  candidatesFor,
  complement,
  lineIndices,
  orthogonalNeighbors,
  pairFamily,
} from "./rules";
import type {
  DnaBase,
  DnaBoard,
  DnaDeduction,
  DnaPuzzle,
  DnaTechnique,
} from "./types";

const WEIGHT: Record<DnaTechnique, number> = {
  "naked-single": 1,
  "neighbour-exclusion": 1,
  "bond-complement": 1,
  "pair-saturation": 2,
  "base-saturation": 2,
  "pair-completion": 3,
  "base-completion": 3,
  "bond-narrowing": 4,
};

function explainSingle(
  board: DnaBoard,
  puzzle: Pick<DnaPuzzle, "size" | "bonds">,
  index: number,
  value: DnaBase,
): DnaDeduction {
  const bond = bondedNeighbor(index, puzzle.bonds);
  const bondedBase = bond ? board[bond.index] : null;
  if (bond && bondedBase && complement(bondedBase) === value) {
    return {
      technique: "bond-complement",
      targetCells: [index],
      supportingCells: [bond.index],
      supportingBonds: [bond.id],
      placedBase: value,
      explanation: `Bond ${bond.id} links this cell to ${bondedBase}. Bonded cells complete each other, so this is ${value}.`,
      weight: 1,
    };
  }
  const neighbor = orthogonalNeighbors(puzzle.size, index).find(
    (peer) => board[peer] !== null,
  );
  const row = Math.floor(index / puzzle.size);
  const column = index % puzzle.size;
  for (const [axis, line] of [
    ["row", row],
    ["column", column],
  ] as const) {
    const indices = lineIndices(puzzle.size, axis, line);
    const family = pairFamily(value);
    const opposite = family === "AT" ? "CG" : "AT";
    const familyCount = indices.filter(
      (cell) => board[cell] && pairFamily(board[cell]) === opposite,
    ).length;
    if (familyCount === puzzle.size / 2) {
      return {
        technique: "pair-saturation",
        targetCells: [index],
        supportingCells: indices.filter((cell) => board[cell]),
        supportingBonds: [],
        placedBase: value,
        explanation: `This ${axis} already has its ${opposite === "AT" ? "A–T" : "C–G"} half, so the cell must be ${family === "AT" ? "A or T" : "C or G"}. The remaining rules leave ${value}.`,
        weight: 2,
      };
    }
    const same = indices.filter((cell) => board[cell] === value);
    if (same.length === puzzle.size / 2 - 1) {
      return {
        technique: "base-saturation",
        targetCells: [index],
        supportingCells: same,
        supportingBonds: [],
        placedBase: value,
        explanation: `The ${axis} composition and its remaining homes leave only ${value} here.`,
        weight: 2,
      };
    }
  }
  if (neighbor !== undefined) {
    return {
      technique: "neighbour-exclusion",
      targetCells: [index],
      supportingCells: [neighbor],
      supportingBonds: [],
      placedBase: value,
      explanation: `Matching bases cannot touch. Combining the neighboring cell with this row and column leaves ${value}.`,
      weight: 1,
    };
  }
  return {
    technique: "naked-single",
    targetCells: [index],
    supportingCells: [],
    supportingBonds: [],
    placedBase: value,
    explanation: `Only ${value} can still go in this cell.`,
    weight: 1,
  };
}

export function nextLogicalDeduction(
  board: DnaBoard,
  puzzle: Pick<DnaPuzzle, "size" | "bonds">,
): DnaDeduction | null {
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== null) continue;
    const candidates = candidatesFor(board, puzzle, index);
    if (candidates.length === 1)
      return explainSingle(board, puzzle, index, candidates[0]);
  }
  return null;
}

export function solveLogically(
  board: DnaBoard,
  puzzle: Pick<DnaPuzzle, "size" | "bonds">,
): { solved: boolean; board: DnaBoard; deductions: DnaDeduction[] } {
  const work = [...board];
  const deductions: DnaDeduction[] = [];
  while (work.some((cell) => cell === null)) {
    const deduction = nextLogicalDeduction(work, puzzle);
    if (!deduction?.placedBase) break;
    work[deduction.targetCells[0]] = deduction.placedBase;
    deductions.push(deduction);
  }
  return {
    solved: work.every((cell) => cell !== null),
    board: work,
    deductions,
  };
}

export function techniqueCounts(
  deductions: readonly DnaDeduction[],
): Partial<Record<DnaTechnique, number>> {
  const result: Partial<Record<DnaTechnique, number>> = {};
  for (const deduction of deductions)
    result[deduction.technique] = (result[deduction.technique] ?? 0) + 1;
  return result;
}

export function weightedTechniqueScore(
  deductions: readonly DnaDeduction[],
): number {
  return deductions.reduce(
    (total, deduction) => total + WEIGHT[deduction.technique],
    0,
  );
}
