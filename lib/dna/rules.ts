import type {
  DnaBase,
  DnaBoard,
  DnaBond,
  DnaConflictMap,
  DnaConflictReason,
  DnaPairFamily,
  DnaPuzzle,
  DnaSize,
} from "./types";

export const DNA_BASES: readonly DnaBase[] = ["A", "T", "C", "G"];

export function complement(base: DnaBase): DnaBase {
  return ({ A: "T", T: "A", C: "G", G: "C" } as const)[base];
}

export function pairFamily(base: DnaBase): DnaPairFamily {
  return base === "A" || base === "T" ? "AT" : "CG";
}

export function lineIndices(
  size: DnaSize,
  axis: "row" | "column",
  index: number,
): number[] {
  return Array.from({ length: size }, (_, offset) =>
    axis === "row" ? index * size + offset : offset * size + index,
  );
}

export function orthogonalNeighbors(size: DnaSize, index: number): number[] {
  const row = Math.floor(index / size);
  const column = index % size;
  const result: number[] = [];
  if (row > 0) result.push(index - size);
  if (row + 1 < size) result.push(index + size);
  if (column > 0) result.push(index - 1);
  if (column + 1 < size) result.push(index + 1);
  return result;
}

export function bondedNeighbor(
  index: number,
  bonds: readonly DnaBond[],
): { index: number; id: string } | null {
  for (const bond of bonds) {
    if (bond.a === index) return { index: bond.b, id: bond.id };
    if (bond.b === index) return { index: bond.a, id: bond.id };
  }
  return null;
}

function lineCanFinish(
  board: DnaBoard,
  indices: number[],
  size: DnaSize,
): boolean {
  const values = indices.map((index) => board[index]);
  const open = values.filter((value) => value === null).length;
  const familyCount = (family: DnaPairFamily) =>
    values.filter((value) => value && pairFamily(value) === family).length;
  if (familyCount("AT") > size / 2 || familyCount("CG") > size / 2)
    return false;
  for (const base of DNA_BASES) {
    const count = values.filter((value) => value === base).length;
    if (count > size / 2 - 1 || (count === 0 && open === 0)) return false;
  }
  return true;
}

export function candidatesFor(
  board: DnaBoard,
  puzzle: Pick<DnaPuzzle, "size" | "bonds">,
  index: number,
): DnaBase[] {
  if (board[index] !== null) return [];
  return DNA_BASES.filter((base) => {
    const next = [...board];
    next[index] = base;
    return isValidPartialBoard(next, puzzle);
  });
}

function addConflict(
  map: DnaConflictMap,
  index: number,
  reason: DnaConflictReason,
  related: number[] = [],
  bondId?: string,
): void {
  const record = map.get(index) ?? {
    reasons: [],
    relatedCells: [],
    bondIds: [],
  };
  if (!record.reasons.includes(reason)) record.reasons.push(reason);
  for (const cell of related)
    if (!record.relatedCells.includes(cell)) record.relatedCells.push(cell);
  if (bondId && !record.bondIds.includes(bondId)) record.bondIds.push(bondId);
  map.set(index, record);
}

export function findConflicts(
  board: DnaBoard,
  puzzle: Pick<DnaPuzzle, "size" | "bonds">,
): DnaConflictMap {
  const map: DnaConflictMap = new Map();
  if (board.length !== puzzle.size * puzzle.size) return map;
  for (let index = 0; index < board.length; index += 1) {
    const value = board[index];
    if (!value) continue;
    for (const peer of orthogonalNeighbors(puzzle.size, index)) {
      if (peer > index && board[peer] === value) {
        addConflict(map, index, "identical-neighbor", [peer]);
        addConflict(map, peer, "identical-neighbor", [index]);
      }
    }
  }
  for (const bond of puzzle.bonds) {
    const a = board[bond.a];
    const b = board[bond.b];
    if (a && b && complement(a) !== b) {
      addConflict(map, bond.a, "bond-complement", [bond.b], bond.id);
      addConflict(map, bond.b, "bond-complement", [bond.a], bond.id);
    }
  }
  for (const axis of ["row", "column"] as const) {
    for (let line = 0; line < puzzle.size; line += 1) {
      const indices = lineIndices(puzzle.size, axis, line);
      if (lineCanFinish(board, indices, puzzle.size)) continue;
      const complete = indices.every((index) => board[index] !== null);
      const values = indices.map((index) => board[index]);
      const familyBroken = ["AT", "CG"].some(
        (family) =>
          values.filter((value) => value && pairFamily(value) === family)
            .length >
          puzzle.size / 2,
      );
      for (const index of indices)
        if (board[index])
          addConflict(
            map,
            index,
            familyBroken
              ? "line-pair-balance"
              : complete
                ? "missing-base"
                : "line-pair-balance",
            indices.filter((peer) => peer !== index),
          );
    }
  }
  return map;
}

export function isValidPartialBoard(
  board: DnaBoard,
  puzzle: Pick<DnaPuzzle, "size" | "bonds">,
): boolean {
  return (
    board.length === puzzle.size * puzzle.size &&
    findConflicts(board, puzzle).size === 0
  );
}

export function isSolved(
  board: DnaBoard,
  puzzle: Pick<DnaPuzzle, "size" | "bonds">,
): boolean {
  return (
    board.every((cell) => cell !== null) && isValidPartialBoard(board, puzzle)
  );
}
