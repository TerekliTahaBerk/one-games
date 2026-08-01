import { candidatesFor, isValidPartialBoard } from "./rules";
import type { DnaBase, DnaBoard, DnaPuzzle } from "./types";

export function countSolutions(
  board: DnaBoard,
  puzzle: Pick<DnaPuzzle, "size" | "bonds">,
  limit = 2,
): { count: number; first: DnaBase[] | null } {
  if (!isValidPartialBoard(board, puzzle)) return { count: 0, first: null };
  const work = [...board];
  let count = 0;
  let first: DnaBase[] | null = null;
  const search = () => {
    if (count >= limit) return;
    let target = -1;
    let options: DnaBase[] = [];
    for (let index = 0; index < work.length; index += 1) {
      if (work[index] !== null) continue;
      const next = candidatesFor(work, puzzle, index);
      if (!next.length) return;
      if (target < 0 || next.length < options.length) {
        target = index;
        options = next;
      }
      if (options.length === 1) break;
    }
    if (target < 0) {
      count += 1;
      if (!first) first = work.filter((cell): cell is DnaBase => cell !== null);
      return;
    }
    for (const base of options) {
      work[target] = base;
      search();
      work[target] = null;
      if (count >= limit) return;
    }
  };
  search();
  return { count, first };
}

export function solveExact(
  board: DnaBoard,
  puzzle: Pick<DnaPuzzle, "size" | "bonds">,
): DnaBase[] | null {
  return countSolutions(board, puzzle, 1).first;
}
