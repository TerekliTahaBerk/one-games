/**
 * Sudoku rules for build tooling.
 *
 * This mirrors lib/sudoku/constraints.ts so the generator and the validator can
 * run on plain Node without a TypeScript loader — the same arrangement the
 * board generator has always used. The TypeScript engine stays the authority:
 * tests/puzzle-bank.test.ts re-validates the shipped bank with it.
 */

export const SIZE = 9;
export const CELL_COUNT = 81;

export const COLOR_KEYS = ["coral", "violet", "mint", "gold", "sky"];

export const rowOf = (index) => Math.floor(index / SIZE);
export const columnOf = (index) => index % SIZE;
export const boxOf = (index) => Math.floor(rowOf(index) / 3) * 3 + Math.floor(columnOf(index) / 3);

export const STANDARD_PEERS = Array.from({ length: CELL_COUNT }, (_, index) => {
  const row = rowOf(index);
  const column = columnOf(index);
  const boxRow = Math.floor(row / 3) * 3;
  const boxColumn = Math.floor(column / 3) * 3;
  const set = new Set();
  for (let i = 0; i < SIZE; i += 1) {
    set.add(row * SIZE + i);
    set.add(i * SIZE + column);
    set.add((boxRow + Math.floor(i / 3)) * SIZE + boxColumn + (i % 3));
  }
  set.delete(index);
  return [...set];
});

/** cell index -> the colored group that owns it (at most one). */
export function indexGroups(groups) {
  const byCell = new Map();
  for (const group of groups) {
    for (const cell of group.cells) byCell.set(cell, group);
  }
  return byCell;
}

export function allPeers(index, byCell) {
  const group = byCell.get(index);
  if (!group) return STANDARD_PEERS[index];
  const set = new Set(STANDARD_PEERS[index]);
  for (const cell of group.cells) if (cell !== index) set.add(cell);
  return [...set];
}

export function candidates(board, index, byCell) {
  const used = new Set();
  for (const peer of allPeers(index, byCell)) if (board[peer]) used.add(board[peer]);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !used.has(value));
}

export function countSolutions(board, limit, byCell, shuffleFn) {
  let target = -1;
  let options = [];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (board[index] !== 0) continue;
    const next = candidates(board, index, byCell);
    if (next.length === 0) return 0;
    if (target === -1 || next.length < options.length) {
      target = index;
      options = next;
      if (next.length === 1) break;
    }
  }
  if (target === -1) return 1;

  let found = 0;
  for (const value of shuffleFn ? shuffleFn(options) : options) {
    board[target] = value;
    found += countSolutions(board, limit - found, byCell, shuffleFn);
    board[target] = 0;
    if (found >= limit) break;
  }
  return found;
}

export function solve(board, groups = []) {
  const byCell = indexGroups(groups);
  const working = [...board];
  const fill = () => {
    let target = -1;
    let options = [];
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (working[index] !== 0) continue;
      const next = candidates(working, index, byCell);
      if (next.length === 0) return false;
      if (target === -1 || next.length < options.length) {
        target = index;
        options = next;
        if (next.length === 1) break;
      }
    }
    if (target === -1) return true;
    for (const value of options) {
      working[target] = value;
      if (fill()) return true;
      working[target] = 0;
    }
    return false;
  };
  return fill() ? working : null;
}

export function parseClues(text) {
  if (typeof text !== "string" || text.length !== CELL_COUNT || !/^[0-9]{81}$/.test(text)) {
    throw new Error(`Invalid clue string: ${text}`);
  }
  return [...text].map(Number);
}

/* --------------------------------------------------------------------------
   Colored-group shape catalogue

   Every shape is authored so that no two of its cells share a row or a column
   and the shape spans at least two 3x3 boxes — otherwise the group would only
   restate a rule the board already enforces. Shapes are readable figures:
   diagonals, arcs, crowns, pinwheels and constellations.
   -------------------------------------------------------------------------- */

const at = ([row, column]) => row * SIZE + column;
const shape = (name, cells) => ({ name, cells: cells.map(at) });

export const SHAPES = [
  // Three-cell figures
  shape("nw-step", [[1, 1], [2, 2], [3, 3]]),
  shape("ne-step", [[1, 7], [2, 6], [3, 5]]),
  shape("sw-step", [[7, 1], [6, 2], [5, 3]]),
  shape("se-step", [[7, 7], [6, 6], [5, 5]]),
  shape("north-crown", [[0, 2], [1, 4], [2, 6]]),
  shape("south-crown", [[8, 6], [7, 4], [6, 2]]),
  shape("west-crown", [[2, 0], [4, 1], [6, 2]]),
  shape("east-crown", [[2, 8], [4, 7], [6, 6]]),
  shape("centre-tri", [[2, 4], [4, 3], [5, 5]]),

  // Four-cell figures
  shape("diag-nw", [[0, 0], [1, 1], [2, 2], [3, 3]]),
  shape("diag-se", [[5, 5], [6, 6], [7, 7], [8, 8]]),
  shape("diag-ne", [[0, 8], [1, 7], [2, 6], [3, 5]]),
  shape("diag-sw", [[5, 3], [6, 2], [7, 1], [8, 0]]),
  shape("pinwheel", [[2, 3], [3, 6], [6, 5], [5, 2]]),
  shape("kite-north", [[0, 3], [1, 5], [2, 1], [3, 7]]),
  shape("kite-south", [[8, 5], [7, 3], [6, 7], [5, 1]]),
  shape("arc-west", [[1, 0], [3, 1], [5, 2], [7, 3]]),
  shape("arc-east", [[1, 8], [3, 7], [5, 6], [7, 5]]),
  shape("arc-north", [[0, 1], [1, 3], [2, 5], [3, 7]]),
  shape("arc-south", [[8, 7], [7, 5], [6, 3], [5, 1]]),
  shape("north-band", [[0, 0], [1, 4], [2, 8], [3, 2]]),
  shape("south-band", [[8, 8], [7, 4], [6, 0], [5, 6]]),
  shape("west-band", [[0, 2], [4, 0], [8, 1], [2, 3]]),
  shape("east-band", [[0, 6], [4, 8], [8, 7], [2, 5]]),
  shape("chevron-north", [[5, 0], [3, 2], [1, 4], [2, 7]]),
  shape("chevron-south", [[3, 8], [5, 6], [7, 4], [6, 1]]),
  shape("twin-peaks", [[0, 5], [2, 2], [6, 6], [8, 3]]),
  shape("twin-valleys", [[0, 3], [2, 6], [6, 2], [8, 5]]),
  shape("cross-nw", [[1, 5], [3, 3], [5, 1], [7, 0]]),
  shape("cross-ne", [[1, 3], [3, 5], [5, 7], [7, 8]]),

  // Five-cell figures
  shape("long-diag-nw", [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]),
  shape("long-diag-ne", [[0, 8], [1, 7], [2, 6], [3, 5], [4, 4]]),
  shape("long-diag-sw", [[8, 0], [7, 1], [6, 2], [5, 3], [4, 4]]),
  shape("long-diag-se", [[8, 8], [7, 7], [6, 6], [5, 5], [4, 4]]),
  shape("zigzag-north", [[0, 2], [1, 4], [2, 6], [3, 8], [4, 5]]),
  shape("zigzag-south", [[8, 6], [7, 4], [6, 2], [5, 0], [4, 3]]),
  shape("spine-west", [[0, 0], [2, 1], [4, 2], [6, 3], [8, 4]]),
  shape("spine-east", [[0, 8], [2, 7], [4, 6], [6, 5], [8, 4]]),
  shape("constellation-a", [[1, 2], [2, 5], [4, 8], [6, 4], [7, 1]]),
  shape("constellation-b", [[1, 6], [2, 3], [4, 0], [6, 4], [7, 7]]),
  shape("ladder-north", [[0, 3], [1, 6], [2, 0], [3, 4], [4, 7]]),
  shape("ladder-south", [[8, 5], [7, 2], [6, 8], [5, 4], [4, 1]]),
  shape("orbit", [[0, 4], [2, 8], [4, 5], [6, 1], [8, 3]]),
  shape("orbit-mirror", [[0, 4], [2, 0], [4, 3], [6, 7], [8, 5]]),

  // Six-cell figures
  shape("full-diag", [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]),
  shape("full-anti", [[0, 8], [1, 7], [2, 6], [3, 5], [4, 4], [5, 3]]),
  shape("wave", [[0, 1], [1, 4], [2, 7], [6, 2], [7, 5], [8, 8]]),
  shape("wave-mirror", [[0, 7], [1, 4], [2, 1], [6, 6], [7, 3], [8, 0]]),
  shape("lattice", [[0, 4], [2, 0], [3, 8], [5, 2], [6, 6], [8, 3]]),
  shape("double-arc", [[0, 2], [1, 5], [2, 8], [6, 0], [7, 3], [8, 6]]),
  shape("double-arc-mirror", [[0, 6], [1, 3], [2, 0], [6, 8], [7, 5], [8, 2]]),
];

/** Guards the catalogue itself, so a typo can never reach a puzzle. */
export function assertShapeCatalogue() {
  const seen = new Set();
  for (const { name, cells } of SHAPES) {
    if (seen.has(name)) throw new Error(`Duplicate shape name: ${name}`);
    seen.add(name);
    if (cells.length < 3 || cells.length > 6) throw new Error(`${name}: size out of range`);
    if (new Set(cells).size !== cells.length) throw new Error(`${name}: repeats a cell`);
    if (cells.some((cell) => !Number.isInteger(cell) || cell < 0 || cell > 80)) {
      throw new Error(`${name}: cell index out of range`);
    }
    if (new Set(cells.map(rowOf)).size !== cells.length) throw new Error(`${name}: repeats a row`);
    if (new Set(cells.map(columnOf)).size !== cells.length) {
      throw new Error(`${name}: repeats a column`);
    }
    if (new Set(cells.map(boxOf)).size < 2) throw new Error(`${name}: sits inside one box`);
  }
}

export const GROUP_PLAN = {
  easy: { sizes: [3, 4], target: 3, min: 2 },
  medium: { sizes: [4, 5], target: 4, min: 3 },
  hard: { sizes: [4, 5, 6], target: 5, min: 4 },
};

function hashText(text) {
  return [...text].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 17);
}

/**
 * Picks a legible, non-overlapping set of colored groups for one puzzle.
 *
 * A shape is only usable when the puzzle's own solution already places nine
 * distinct values across it — that keeps the single solution intact under the
 * added rule and guarantees the given clues never break it.
 */
export function assignColoredGroups(puzzleId, clues, solution) {
  const plan = GROUP_PLAN[puzzleId.split("-")[0]];
  if (!plan) throw new Error(`No group plan for ${puzzleId}`);

  const usable = SHAPES.filter(
    ({ cells }) =>
      plan.sizes.includes(cells.length) &&
      new Set(cells.map((cell) => solution[cell])).size === cells.length,
  );

  // Rotating the catalogue by the puzzle id keeps the choice deterministic while
  // giving neighbouring puzzles visibly different layouts.
  const offset = usable.length ? hashText(puzzleId) % usable.length : 0;
  const ordered = [...usable.slice(offset), ...usable.slice(0, offset)];

  // Small exhaustive search for the largest non-overlapping set, stopping the
  // moment the difficulty's target is reached.
  let best = [];
  const picked = [];
  const taken = new Set();
  const search = (position) => {
    if (picked.length > best.length) best = [...picked];
    if (best.length >= plan.target) return true;
    if (position >= ordered.length) return false;
    if (picked.length + (ordered.length - position) <= best.length) return false;

    const candidate = ordered[position];
    if (!candidate.cells.some((cell) => taken.has(cell))) {
      candidate.cells.forEach((cell) => taken.add(cell));
      picked.push(candidate);
      if (search(position + 1)) return true;
      picked.pop();
      candidate.cells.forEach((cell) => taken.delete(cell));
    }
    return search(position + 1);
  };
  search(0);

  if (best.length < plan.min) {
    throw new Error(`${puzzleId}: only ${best.length} colored groups fit (need ${plan.min})`);
  }

  return best.map((candidate, position) => ({
    id: COLOR_KEYS[position % COLOR_KEYS.length],
    color: COLOR_KEYS[position % COLOR_KEYS.length],
    cells: [...candidate.cells].sort((a, b) => a - b),
  }));
}

/* --------------------------------------------------------------------------
   Validation
   -------------------------------------------------------------------------- */

/** Returns a list of human-readable problems; an empty list means the puzzle is good. */
export function validatePuzzleRecord(record, difficulty) {
  const issues = [];
  const fail = (message) => issues.push(message);

  if (typeof record?.id !== "string" || !record.id) fail("missing id");
  if (record?.id && !record.id.startsWith(`${difficulty}-`)) {
    fail(`id "${record.id}" does not belong to the ${difficulty} bank`);
  }

  let clues;
  try {
    clues = parseClues(record?.clues);
  } catch (error) {
    fail(String(error.message));
    return issues;
  }

  const groups = record.coloredGroups;
  if (!Array.isArray(groups)) {
    fail("coloredGroups must be an array");
    return issues;
  }

  const owner = new Map();
  const ids = new Set();
  for (const group of groups) {
    if (typeof group?.id !== "string" || !group.id) fail("a group is missing an id");
    if (ids.has(group?.id)) fail(`duplicate group id "${group.id}"`);
    ids.add(group?.id);
    if (!COLOR_KEYS.includes(group?.color)) fail(`group "${group?.id}" has an unknown color`);
    if (!Array.isArray(group?.cells) || group.cells.length < 2) {
      fail(`group "${group?.id}" needs at least two cells`);
      continue;
    }
    const seen = new Set();
    for (const cell of group.cells) {
      if (!Number.isInteger(cell) || cell < 0 || cell >= CELL_COUNT) {
        fail(`group "${group.id}" has an out-of-range cell ${cell}`);
        continue;
      }
      if (seen.has(cell)) fail(`group "${group.id}" repeats cell ${cell}`);
      seen.add(cell);
      if (owner.has(cell)) {
        fail(`cell ${cell} belongs to both "${owner.get(cell)}" and "${group.id}"`);
      } else {
        owner.set(cell, group.id);
      }
    }
    const values = group.cells.map((cell) => clues[cell]).filter(Boolean);
    if (new Set(values).size !== values.length) {
      fail(`group "${group.id}" already repeats a given clue value`);
    }
  }

  if (issues.length) return issues;

  const byCell = indexGroups(groups);
  const working = [...clues];
  const solutions = countSolutions(working, 2, byCell);
  if (solutions === 0) fail("no solution under the colored rules");
  if (solutions > 1) fail("more than one solution");

  return issues;
}
