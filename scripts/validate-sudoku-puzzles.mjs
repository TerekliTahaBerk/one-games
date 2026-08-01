/**
 * Checks lib/sudoku/puzzle-bank.json from the command line.
 *
 *   npm run validate:sudoku
 *
 * Every shipped puzzle must be well formed, must keep exactly one solution once
 * the colored-group rule is applied, and must not hand the player a layout that
 * is already broken by its own given clues.
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertShapeCatalogue,
  boxOf,
  columnOf,
  GROUP_PLAN,
  rowOf,
  validatePuzzleRecord,
} from "./lib/sudoku-rules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = resolve(ROOT, "lib/sudoku/puzzle-bank.json");
const DIFFICULTIES = ["easy", "medium", "hard"];

assertShapeCatalogue();

const bank = JSON.parse(await readFile(TARGET, "utf8"));
const failures = [];
const ids = new Set();
const grids = new Set();

for (const difficulty of DIFFICULTIES) {
  const records = bank[difficulty];
  if (!Array.isArray(records) || records.length === 0) {
    failures.push(`${difficulty}: bank is missing or empty`);
    continue;
  }

  const plan = GROUP_PLAN[difficulty];

  for (const record of records) {
    const label = record?.id ?? "<unnamed>";
    for (const issue of validatePuzzleRecord(record, difficulty)) {
      failures.push(`${label}: ${issue}`);
    }

    if (ids.has(record?.id)) failures.push(`${label}: duplicate puzzle id`);
    ids.add(record?.id);
    if (grids.has(record?.clues)) failures.push(`${label}: duplicate grid`);
    grids.add(record?.clues);

    const groups = Array.isArray(record?.coloredGroups) ? record.coloredGroups : [];
    if (groups.length && groups.length < plan.min) {
      failures.push(`${label}: ${groups.length} colored groups, expected at least ${plan.min}`);
    }
    if (groups.length > plan.target) {
      failures.push(`${label}: ${groups.length} colored groups, expected at most ${plan.target}`);
    }

    for (const group of groups) {
      const cells = group?.cells ?? [];
      const [low, high] = [Math.min(...plan.sizes), Math.max(...plan.sizes)];
      if (cells.length < low || cells.length > high) {
        failures.push(`${label}/${group?.id}: ${cells.length} cells, expected ${low}–${high}`);
      }
      if (new Set(cells.map(boxOf)).size < 2) {
        failures.push(`${label}/${group?.id}: sits inside a single 3×3 box`);
      }
      if (new Set(cells.map(rowOf)).size === 1 || new Set(cells.map(columnOf)).size === 1) {
        failures.push(`${label}/${group?.id}: sits inside a single row or column`);
      }
    }

    const colored = groups.reduce((total, group) => total + (group?.cells?.length ?? 0), 0);
    if (colored > 32) failures.push(`${label}: ${colored} colored cells is too much of the board`);
  }
}

if (failures.length) {
  console.error(`✗ ${failures.length} problem(s) in the Sudoku puzzle bank:\n`);
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}

const total = DIFFICULTIES.reduce((count, difficulty) => count + bank[difficulty].length, 0);
const groups = DIFFICULTIES.reduce(
  (count, difficulty) =>
    count + bank[difficulty].reduce((sum, record) => sum + record.coloredGroups.length, 0),
  0,
);
console.log(`✓ ${total} puzzles, ${groups} colored groups — all valid.`);
