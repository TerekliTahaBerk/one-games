import type { Board } from "./types";

const SIZE = 9;
const CELL_COUNT = 81;

export function isValidBoard(board: Board): boolean {
  return (
    board.length === CELL_COUNT &&
    board.every((value) => Number.isInteger(value) && value >= 0 && value <= 9)
  );
}

export function peers(index: number): number[] {
  const row = Math.floor(index / SIZE);
  const column = index % SIZE;
  const boxRow = Math.floor(row / 3) * 3;
  const boxColumn = Math.floor(column / 3) * 3;
  const result = new Set<number>();
  for (let i = 0; i < SIZE; i += 1) {
    result.add(row * SIZE + i);
    result.add(i * SIZE + column);
    result.add((boxRow + Math.floor(i / 3)) * SIZE + boxColumn + (i % 3));
  }
  result.delete(index);
  return [...result];
}

export function candidatesFor(board: Board, index: number): number[] {
  if (!isValidBoard(board) || board[index] !== 0) return [];
  const used = new Set(peers(index).map((peer) => board[peer]).filter(Boolean));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !used.has(value));
}

export function conflictIndices(board: Board): Set<number> {
  const conflicts = new Set<number>();
  if (!isValidBoard(board)) return conflicts;
  board.forEach((value, index) => {
    if (!value) return;
    peers(index).forEach((peer) => {
      if (board[peer] === value) {
        conflicts.add(index);
        conflicts.add(peer);
      }
    });
  });
  return conflicts;
}

function solveMutable(board: Board, solutions: Board[], limit: number): void {
  if (solutions.length >= limit) return;
  let target = -1;
  let options: number[] = [];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (board[index] !== 0) continue;
    const next = candidatesFor(board, index);
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
    solveMutable(board, solutions, limit);
    board[target] = 0;
  });
}

export function solve(board: Board): Board | null {
  if (!isValidBoard(board) || conflictIndices(board).size > 0) return null;
  const solutions: Board[] = [];
  solveMutable([...board], solutions, 1);
  return solutions[0] ?? null;
}

export function hasUniqueSolution(board: Board): boolean {
  if (!isValidBoard(board) || conflictIndices(board).size > 0) return false;
  const solutions: Board[] = [];
  solveMutable([...board], solutions, 2);
  return solutions.length === 1;
}

export function isComplete(board: Board): boolean {
  return isValidBoard(board) && board.every(Boolean) && conflictIndices(board).size === 0;
}

export function parsePuzzle(puzzle: string): Board {
  const board = [...puzzle].map((character) => Number(character));
  if (!isValidBoard(board)) throw new Error("Invalid puzzle data");
  return board;
}
