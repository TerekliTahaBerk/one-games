export const BASES = ["A", "T", "C", "G"];
export const complement = (base) => ({ A: "T", T: "A", C: "G", G: "C" })[base];
export const family = (base) => (base === "A" || base === "T" ? "AT" : "CG");

export function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function neighbors(size, index) {
  const row = Math.floor(index / size),
    column = index % size,
    result = [];
  if (row) result.push(index - size);
  if (row + 1 < size) result.push(index + size);
  if (column) result.push(index - 1);
  if (column + 1 < size) result.push(index + 1);
  return result;
}

export function lines(size, index) {
  const row = Math.floor(index / size),
    column = index % size;
  return [
    Array.from({ length: size }, (_, i) => row * size + i),
    Array.from({ length: size }, (_, i) => i * size + column),
  ];
}

export function validPartial(board, size, bonds) {
  if (board.length !== size * size) return false;
  for (let i = 0; i < board.length; i += 1)
    if (board[i])
      for (const j of neighbors(size, i))
        if (j > i && board[j] === board[i]) return false;
  for (const [a, b] of bonds)
    if (board[a] && board[b] && complement(board[a]) !== board[b]) return false;
  for (let line = 0; line < size; line += 1)
    for (const indices of [
      Array.from({ length: size }, (_, i) => line * size + i),
      Array.from({ length: size }, (_, i) => i * size + line),
    ]) {
      const values = indices.map((i) => board[i]);
      const open = values.filter((v) => !v).length;
      for (const pair of ["AT", "CG"])
        if (values.filter((v) => v && family(v) === pair).length > size / 2)
          return false;
      for (const base of BASES) {
        const count = values.filter((v) => v === base).length;
        if (count > size / 2 - 1 || (!open && !count)) return false;
      }
    }
  return true;
}

export function candidates(board, size, bonds, index) {
  if (board[index]) return [];
  return BASES.filter((base) => {
    board[index] = base;
    const ok = validPartial(board, size, bonds);
    board[index] = null;
    return ok;
  });
}

export function countSolutions(clues, size, bonds, limit = 2) {
  const board = [...clues];
  let count = 0;
  let first = null;
  if (!validPartial(board, size, bonds)) return { count, first };
  const search = () => {
    if (count >= limit) return;
    let target = -1,
      options = [];
    for (let i = 0; i < board.length; i += 1)
      if (!board[i]) {
        const next = candidates(board, size, bonds, i);
        if (!next.length) return;
        if (target < 0 || next.length < options.length) {
          target = i;
          options = next;
        }
        if (options.length === 1) break;
      }
    if (target < 0) {
      count += 1;
      first ??= [...board];
      return;
    }
    for (const base of options) {
      board[target] = base;
      search();
      board[target] = null;
      if (count >= limit) return;
    }
  };
  search();
  return { count, first };
}

export function logicalSolve(clues, size, bonds) {
  const board = [...clues],
    path = [],
    counts = {};
  while (board.some((cell) => !cell)) {
    let move = null;
    for (let index = 0; index < board.length; index += 1)
      if (!board[index]) {
        const options = candidates(board, size, bonds, index);
        if (options.length === 1) {
          move = { index, base: options[0] };
          break;
        }
      }
    if (!move) break;
    const partner = bonds.find(
      ([a, b]) => a === move.index || b === move.index,
    );
    let technique = "naked-single";
    if (partner) {
      const other = partner[0] === move.index ? partner[1] : partner[0];
      if (board[other]) technique = "bond-complement";
    }
    if (
      technique === "naked-single" &&
      neighbors(size, move.index).some((peer) => board[peer])
    )
      technique = "neighbour-exclusion";
    board[move.index] = move.base;
    path.push({ technique, ...move });
    counts[technique] = (counts[technique] ?? 0) + 1;
  }
  return { solved: board.every(Boolean), board, path, counts };
}

export function generateSolution(size, random) {
  const board = Array(size * size).fill(null),
    noBonds = [];
  const search = () => {
    let target = -1,
      options = [];
    for (let i = 0; i < board.length; i += 1)
      if (!board[i]) {
        const next = shuffle(candidates(board, size, noBonds, i), random);
        if (!next.length) return false;
        if (target < 0 || next.length < options.length) {
          target = i;
          options = next;
        }
      }
    if (target < 0) return true;
    for (const base of options) {
      board[target] = base;
      if (search()) return true;
      board[target] = null;
    }
    return false;
  };
  if (!search()) throw new Error(`Could not generate ${size}x${size} solution`);
  return board;
}

export function pickBonds(solution, size, count, random) {
  const pairs = [];
  for (let a = 0; a < solution.length; a += 1)
    for (let b = a + 1; b < solution.length; b += 1) {
      const distance =
        Math.abs(Math.floor(a / size) - Math.floor(b / size)) +
        Math.abs((a % size) - (b % size));
      if (distance >= 2 && complement(solution[a]) === solution[b])
        pairs.push([a, b]);
    }
  const used = new Set(),
    result = [];
  for (const pair of shuffle(pairs, random)) {
    if (used.has(pair[0]) || used.has(pair[1])) continue;
    result.push(pair);
    used.add(pair[0]);
    used.add(pair[1]);
    if (result.length === count) break;
  }
  if (result.length !== count) throw new Error("Could not place bonds");
  return result.sort((a, b) => a[0] - b[0]);
}

export function carve(solution, size, bonds, floor, random) {
  const clues = [...solution];
  let count = clues.length;
  for (const index of shuffle([...clues.keys()], random)) {
    if (count <= floor) break;
    const old = clues[index];
    clues[index] = null;
    const logical = logicalSolve(clues, size, bonds);
    if (
      logical.solved &&
      logical.board.every((base, i) => base === solution[i]) &&
      countSolutions(clues, size, bonds, 2).count === 1
    )
      count -= 1;
    else clues[index] = old;
  }
  return clues;
}

export function validateRecord(record) {
  const issues = [],
    { size, clues, solution, bonds = [] } = record;
  if (![6, 8].includes(size)) issues.push("invalid size");
  if (
    typeof clues !== "string" ||
    clues.length !== size * size ||
    /[^ATCG.]/.test(clues)
  )
    issues.push("invalid clues");
  if (
    typeof solution !== "string" ||
    solution.length !== size * size ||
    /[^ATCG]/.test(solution)
  )
    issues.push("invalid solution");
  const clueBoard =
    typeof clues === "string"
      ? [...clues].map((v) => (v === "." ? null : v))
      : [];
  const solutionBoard = typeof solution === "string" ? [...solution] : [];
  const tuples = bonds.map((bond) => [bond[0], bond[1]]);
  const used = new Set();
  for (const [a, b] of tuples) {
    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < 0 ||
      b < 0 ||
      a >= size * size ||
      b >= size * size ||
      a === b
    )
      issues.push("malformed bond");
    if (used.has(a) || used.has(b)) issues.push("overlapping bond");
    used.add(a);
    used.add(b);
    const distance =
      Math.abs(Math.floor(a / size) - Math.floor(b / size)) +
      Math.abs((a % size) - (b % size));
    if (distance < 2) issues.push("short bond");
  }
  if (issues.length) return issues;
  if (
    !validPartial(solutionBoard, size, tuples) ||
    solutionBoard.some((v) => !v)
  )
    issues.push("invalid completed solution");
  if (!validPartial(clueBoard, size, tuples)) issues.push("invalid givens");
  if (clueBoard.some((v, i) => v && v !== solutionBoard[i]))
    issues.push("clue differs from solution");
  if (countSolutions(clueBoard, size, tuples, 2).count !== 1)
    issues.push("solution is not unique");
  const logical = logicalSolve(clueBoard, size, tuples);
  if (!logical.solved || logical.board.some((v, i) => v !== solutionBoard[i]))
    issues.push("not logically solvable");
  return issues;
}
