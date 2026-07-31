/**
 * Regenerates the curated puzzle bank in lib/sudoku/puzzles.ts.
 *
 * Every candidate is dug out of a randomly generated solved grid and kept only
 * if it still has exactly one solution, so the bank can never contain an
 * ambiguous or unsolvable grid. Difficulty is expressed as a clue budget, and
 * the three banks are guaranteed to be disjoint.
 *
 *   node scripts/generate-puzzles.mjs [seed]
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = resolve(ROOT, "lib/sudoku/puzzles.ts");

const PER_DIFFICULTY = 12;
const CLUE_BUDGET = {
  easy: { min: 38, max: 42 },
  medium: { min: 30, max: 34 },
  hard: { min: 24, max: 28 },
};

/* --- seeded RNG so a given seed always yields the same bank --------------- */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(Number(process.argv[2] ?? 20260731));

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* --- solver (mirrors lib/sudoku/solver.ts, kept local for build tooling) --- */
const PEERS = Array.from({ length: 81 }, (_, index) => {
  const row = Math.floor(index / 9);
  const column = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxColumn = Math.floor(column / 3) * 3;
  const set = new Set();
  for (let i = 0; i < 9; i += 1) {
    set.add(row * 9 + i);
    set.add(i * 9 + column);
    set.add((boxRow + Math.floor(i / 3)) * 9 + boxColumn + (i % 3));
  }
  set.delete(index);
  return [...set];
});

function candidates(board, index) {
  const used = new Set();
  for (const peer of PEERS[index]) if (board[peer]) used.add(board[peer]);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !used.has(value));
}

function countSolutions(board, limit, randomise = false) {
  let target = -1;
  let options = [];
  for (let index = 0; index < 81; index += 1) {
    if (board[index] !== 0) continue;
    const next = candidates(board, index);
    if (next.length === 0) return 0;
    if (target === -1 || next.length < options.length) {
      target = index;
      options = next;
      if (next.length === 1) break;
    }
  }
  if (target === -1) return 1;

  let found = 0;
  for (const value of randomise ? shuffle(options) : options) {
    board[target] = value;
    found += countSolutions(board, limit - found, randomise);
    board[target] = 0;
    if (found >= limit) break;
  }
  return found;
}

function solvedGrid() {
  const board = new Array(81).fill(0);
  const fill = (index) => {
    if (index === 81) return true;
    for (const value of shuffle(candidates(board, index))) {
      board[index] = value;
      if (fill(index + 1)) return true;
      board[index] = 0;
    }
    return false;
  };
  fill(0);
  return board;
}

/** Digs cells out in rotationally symmetric pairs while uniqueness holds. */
function carve(solution, { min, max }) {
  const board = [...solution];
  let clues = 81;

  for (const index of shuffle([...Array(81).keys()])) {
    if (clues <= min) break;
    const mirror = 80 - index;
    const removing = index === mirror ? [index] : [index, mirror];
    if (removing.some((cell) => board[cell] === 0)) continue;
    if (clues - removing.length < min) continue;

    const backup = removing.map((cell) => board[cell]);
    removing.forEach((cell) => {
      board[cell] = 0;
    });

    if (countSolutions([...board], 2) === 1) {
      clues -= removing.length;
    } else {
      removing.forEach((cell, position) => {
        board[cell] = backup[position];
      });
    }
  }

  return clues >= min && clues <= max ? board.join("") : null;
}

function generate(difficulty) {
  const budget = CLUE_BUDGET[difficulty];
  const bank = new Set();
  let attempts = 0;

  while (bank.size < PER_DIFFICULTY) {
    if (++attempts > 400) throw new Error(`Could not fill the ${difficulty} bank`);
    const puzzle = carve(solvedGrid(), budget);
    if (puzzle) bank.add(puzzle);
  }

  return [...bank];
}

const banks = {
  easy: generate("easy"),
  medium: generate("medium"),
  hard: generate("hard"),
};

const seen = new Set();
for (const [difficulty, bank] of Object.entries(banks)) {
  for (const puzzle of bank) {
    if (seen.has(puzzle)) throw new Error(`Duplicate puzzle across banks in ${difficulty}`);
    seen.add(puzzle);
  }
  const clues = bank.map((puzzle) => 81 - (puzzle.match(/0/g)?.length ?? 0));
  console.log(`${difficulty}: ${bank.length} puzzles, ${Math.min(...clues)}–${Math.max(...clues)} clues`);
}

const source = await readFile(TARGET, "utf8");
const rendered = Object.entries(banks)
  .map(
    ([difficulty, bank]) =>
      `  ${difficulty}: [\n${bank.map((puzzle) => `    "${puzzle}",`).join("\n")}\n  ],`,
  )
  .join("\n");

const next = source.replace(
  /const BASE_PUZZLES: Record<Difficulty, string\[\]> = \{[\s\S]*?\n\};/,
  `const BASE_PUZZLES: Record<Difficulty, string[]> = {\n${rendered}\n};`,
);

if (next === source) throw new Error("Could not locate BASE_PUZZLES in lib/sudoku/puzzles.ts");
await writeFile(TARGET, next);
console.log(`Updated ${TARGET}`);
