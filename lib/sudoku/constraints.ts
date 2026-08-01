import type {
  Board,
  CellConflict,
  ColoredGroup,
  ConflictMap,
  ConflictReason,
} from "./types";

/**
 * The single rule engine for OneSudoku.
 *
 * Row, column and box rules and the colored-group rule are evaluated in one
 * place through a shared peer model, so conflicts, candidates, notes, hints,
 * the solver and completion can never drift apart.
 */

export const SIZE = 9;
export const CELL_COUNT = 81;
export const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Callers that have no colored groups can share this, keeping the peer cache warm. */
export const NO_GROUPS: readonly ColoredGroup[] = [];

export const rowOf = (index: number): number => Math.floor(index / SIZE);
export const columnOf = (index: number): number => index % SIZE;
export const boxOf = (index: number): number =>
  Math.floor(rowOf(index) / 3) * 3 + Math.floor(columnOf(index) / 3);

export function isValidBoard(board: Board): boolean {
  return (
    Array.isArray(board) &&
    board.length === CELL_COUNT &&
    board.every((value) => Number.isInteger(value) && value >= 0 && value <= 9)
  );
}

const STANDARD_PEERS: readonly number[][] = Array.from({ length: CELL_COUNT }, (_, index) => {
  const row = rowOf(index);
  const column = columnOf(index);
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
});

/** Row, column and box peers — the classic Sudoku neighbourhood. */
export function getStandardPeers(index: number): number[] {
  return STANDARD_PEERS[index] ?? [];
}

const groupIndexCache = new WeakMap<readonly ColoredGroup[], Map<number, ColoredGroup>>();

/** cell index -> the one colored group that owns it. */
export function indexGroups(groups: readonly ColoredGroup[]): Map<number, ColoredGroup> {
  const cached = groupIndexCache.get(groups);
  if (cached) return cached;
  const byCell = new Map<number, ColoredGroup>();
  for (const group of groups) {
    for (const cell of group.cells) if (!byCell.has(cell)) byCell.set(cell, group);
  }
  groupIndexCache.set(groups, byCell);
  return byCell;
}

export function getGroupFor(
  index: number,
  groups: readonly ColoredGroup[] = NO_GROUPS,
): ColoredGroup | null {
  return indexGroups(groups).get(index) ?? null;
}

/** The other cells sharing this cell's colored group. */
export function getColoredPeers(
  index: number,
  groups: readonly ColoredGroup[] = NO_GROUPS,
): number[] {
  const group = indexGroups(groups).get(index);
  if (!group) return [];
  return group.cells.filter((cell) => cell !== index);
}

/** Every cell whose value this cell may not repeat. */
export function getAllPeers(
  index: number,
  groups: readonly ColoredGroup[] = NO_GROUPS,
): number[] {
  const colored = getColoredPeers(index, groups);
  if (colored.length === 0) return getStandardPeers(index);
  return [...new Set([...getStandardPeers(index), ...colored])];
}

/** Values still open for an empty cell, excluding standard *and* colored peers. */
export function candidatesFor(
  board: Board,
  index: number,
  groups: readonly ColoredGroup[] = NO_GROUPS,
): number[] {
  if (!isValidBoard(board) || board[index] !== 0) return [];
  const used = new Set<number>();
  for (const peer of getAllPeers(index, groups)) {
    if (board[peer]) used.add(board[peer]);
  }
  return VALUES.filter((value) => !used.has(value));
}

function noteConflict(
  map: ConflictMap,
  index: number,
  reason: ConflictReason,
  groupId?: string,
): void {
  const entry: CellConflict = map.get(index) ?? { reasons: [], groupIds: [] };
  if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
  if (groupId && !entry.groupIds.includes(groupId)) entry.groupIds.push(groupId);
  map.set(index, entry);
}

/**
 * Every cell that repeats a value, with the rules it breaks. Both cells in a
 * duplicate pair are reported.
 */
export function conflictDetails(
  board: Board,
  groups: readonly ColoredGroup[] = NO_GROUPS,
): ConflictMap {
  const map: ConflictMap = new Map();
  if (!isValidBoard(board)) return map;
  const byCell = indexGroups(groups);

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const value = board[index];
    if (!value) continue;

    for (const peer of getStandardPeers(index)) {
      if (board[peer] !== value) continue;
      if (rowOf(peer) === rowOf(index)) {
        noteConflict(map, index, "row");
        noteConflict(map, peer, "row");
      }
      if (columnOf(peer) === columnOf(index)) {
        noteConflict(map, index, "column");
        noteConflict(map, peer, "column");
      }
      if (boxOf(peer) === boxOf(index)) {
        noteConflict(map, index, "box");
        noteConflict(map, peer, "box");
      }
    }

    const group = byCell.get(index);
    if (!group) continue;
    for (const peer of group.cells) {
      if (peer === index || board[peer] !== value) continue;
      noteConflict(map, index, "colored-group", group.id);
      noteConflict(map, peer, "colored-group", group.id);
    }
  }

  return map;
}

export function conflictIndices(
  board: Board,
  groups: readonly ColoredGroup[] = NO_GROUPS,
): Set<number> {
  return new Set(conflictDetails(board, groups).keys());
}

/** A board is complete when it is full and breaks no rule, colored ones included. */
export function isComplete(
  board: Board,
  groups: readonly ColoredGroup[] = NO_GROUPS,
): boolean {
  return (
    isValidBoard(board) &&
    board.every((value) => value !== 0) &&
    conflictDetails(board, groups).size === 0
  );
}
