import {
  candidatesFor,
  CELL_COUNT,
  conflictDetails,
  isValidBoard,
  NO_GROUPS,
} from "./constraints";
import type { Board, ColoredGroup } from "./types";

/**
 * Search built on the shared constraint engine — every candidate the solver
 * considers already respects the colored-group rule, so a solution that
 * repeats a number inside a colored group can never be returned.
 */

export {
  boxOf,
  candidatesFor,
  CELL_COUNT,
  columnOf,
  conflictDetails,
  conflictIndices,
  getAllPeers,
  getColoredPeers,
  getGroupFor,
  getStandardPeers,
  isComplete,
  isValidBoard,
  NO_GROUPS,
  rowOf,
  SIZE,
} from "./constraints";

function solveMutable(
  board: Board,
  groups: readonly ColoredGroup[],
  solutions: Board[],
  limit: number,
): void {
  if (solutions.length >= limit) return;
  let target = -1;
  let options: number[] = [];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (board[index] !== 0) continue;
    const next = candidatesFor(board, index, groups);
    if (next.length === 0) return;
    if (target === -1 || next.length < options.length) {
      target = index;
      options = next;
      if (next.length === 1) break;
    }
  }
  if (target === -1) {
    solutions.push([...board]);
    return;
  }
  options.forEach((value) => {
    board[target] = value;
    solveMutable(board, groups, solutions, limit);
    board[target] = 0;
  });
}

export function solve(
  board: Board,
  groups: readonly ColoredGroup[] = NO_GROUPS,
): Board | null {
  if (!isValidBoard(board) || conflictDetails(board, groups).size > 0) return null;
  const solutions: Board[] = [];
  solveMutable([...board], groups, solutions, 1);
  return solutions[0] ?? null;
}

export function hasUniqueSolution(
  board: Board,
  groups: readonly ColoredGroup[] = NO_GROUPS,
): boolean {
  if (!isValidBoard(board) || conflictDetails(board, groups).size > 0) return false;
  const solutions: Board[] = [];
  solveMutable([...board], groups, solutions, 2);
  return solutions.length === 1;
}

export function parsePuzzle(puzzle: string): Board {
  const board = [...puzzle].map((character) => Number(character));
  if (!isValidBoard(board)) throw new Error("Invalid puzzle data");
  return board;
}

/** Kept as the historical name for the classic row/column/box neighbourhood. */
export { getStandardPeers as peers } from "./constraints";
