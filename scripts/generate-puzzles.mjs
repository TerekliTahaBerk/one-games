/**
 * Regenerates the curated puzzle bank in lib/sudoku/puzzle-bank.json.
 *
 * Every candidate grid is dug out of a randomly generated solved grid and kept
 * only if it still has exactly one solution, so the bank can never contain an
 * ambiguous or unsolvable grid. Difficulty is expressed as a clue budget, and
 * the three banks are guaranteed to be disjoint.
 *
 * Each puzzle then gets its own colored-group layout, chosen from the shared
 * shape catalogue so that the puzzle's single solution still holds once the
 * "matching colored cells cannot repeat a number" rule is added.
 *
 *   node scripts/generate-puzzles.mjs [seed]     regenerate grids and groups
 *   node scripts/generate-puzzles.mjs --groups-only
 *                                                keep today's grids, redraw the
 *                                                colored layouts only
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertShapeCatalogue,
  assignColoredGroups,
  candidates,
  countSolutions,
  parseClues,
  solve,
  validatePuzzleRecord,
} from "./lib/sudoku-rules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = resolve(ROOT, "lib/sudoku/puzzle-bank.json");

const DIFFICULTIES = ["easy", "medium", "hard"];
const PER_DIFFICULTY = 12;
const CLUE_BUDGET = {
  easy: { min: 38, max: 42 },
  medium: { min: 30, max: 34 },
  hard: { min: 24, max: 28 },
};

const groupsOnly = process.argv.includes("--groups-only");

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

const NO_GROUPS = new Map();

function solvedGrid() {
  const board = new Array(81).fill(0);
  const fill = (index) => {
    if (index === 81) return true;
    for (const value of shuffle(candidates(board, index, NO_GROUPS))) {
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

    if (countSolutions([...board], 2, NO_GROUPS) === 1) {
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

assertShapeCatalogue();

/** Puzzle ids are positional and therefore stable: easy-01, easy-02, … */
const puzzleId = (difficulty, position) => `${difficulty}-${String(position + 1).padStart(2, "0")}`;

let clueStrings;
if (groupsOnly) {
  const existing = JSON.parse(await readFile(TARGET, "utf8"));
  clueStrings = Object.fromEntries(
    DIFFICULTIES.map((difficulty) => [difficulty, existing[difficulty].map((item) => item.clues)]),
  );
} else {
  clueStrings = Object.fromEntries(DIFFICULTIES.map((d) => [d, generate(d)]));
}

const seen = new Set();
const bank = {};

for (const difficulty of DIFFICULTIES) {
  bank[difficulty] = clueStrings[difficulty].map((clues, position) => {
    if (seen.has(clues)) throw new Error(`Duplicate grid in ${difficulty}`);
    seen.add(clues);
    const id = puzzleId(difficulty, position);
    const board = parseClues(clues);
    const solution = solve(board);
    if (!solution) throw new Error(`${id} has no solution`);
    return { id, clues, coloredGroups: assignColoredGroups(id, board, solution) };
  });
}

for (const difficulty of DIFFICULTIES) {
  for (const record of bank[difficulty]) {
    const issues = validatePuzzleRecord(record, difficulty);
    if (issues.length) throw new Error(`${record.id}: ${issues.join("; ")}`);
  }
  const clueCounts = bank[difficulty].map(
    (record) => 81 - (record.clues.match(/0/g)?.length ?? 0),
  );
  const groupCounts = bank[difficulty].map((record) => record.coloredGroups.length);
  console.log(
    `${difficulty}: ${bank[difficulty].length} puzzles, ` +
      `${Math.min(...clueCounts)}–${Math.max(...clueCounts)} clues, ` +
      `${Math.min(...groupCounts)}–${Math.max(...groupCounts)} colored groups`,
  );
}

await writeFile(TARGET, `${JSON.stringify(bank, null, 2)}\n`);
console.log(`Updated ${TARGET}`);
