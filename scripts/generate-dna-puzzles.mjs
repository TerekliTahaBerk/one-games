import { writeFile } from "node:fs/promises";
import {
  carve,
  generateSolution,
  logicalSolve,
  pickBonds,
  rng,
  validateRecord,
} from "./lib/dna-rules.mjs";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.split("=");
    return [key, value];
  }),
);
const seed = Number(args.get("--seed") ?? 20260801);
const count = Number(args.get("--count") ?? 400);
const dryRun = args.has("--dry-run");
const configurations = {
  easy: { size: 6, floor: 18, bonds: 5, score: 88, tier: 1 },
  medium: { size: 6, floor: 10, bonds: 5, score: 139, tier: 2 },
  hard: { size: 8, floor: 22, bonds: 7, score: 219, tier: 2 },
};
const bank = { easy: [], medium: [], hard: [] };
for (const difficulty of Object.keys(configurations)) {
  const config = configurations[difficulty];
  for (let index = 0; index < count; index += 1) {
    const puzzleSeed =
      seed +
      index +
      (difficulty === "medium" ? 10000 : difficulty === "hard" ? 20000 : 0);
    const random = rng(puzzleSeed);
    const solution = generateSolution(config.size, random);
    const bonds = pickBonds(solution, config.size, config.bonds, random);
    const clues = carve(solution, config.size, bonds, config.floor, random);
    const logical = logicalSolve(clues, config.size, bonds);
    const record = {
      id: `${difficulty}-${String(index + 1).padStart(2, "0")}`,
      size: config.size,
      clues: clues.map((base) => base ?? ".").join(""),
      solution: solution.join(""),
      bonds,
      meta: {
        score: config.score,
        requiredTier: config.tier,
        techniques: logical.counts,
        generator: { seed: puzzleSeed, revision: 1 },
      },
    };
    const issues = validateRecord(record);
    if (issues.length) throw new Error(`${record.id}: ${issues.join(", ")}`);
    bank[difficulty].push(record);
  }
}
const output = `${JSON.stringify(bank, null, 2)}\n`;
if (dryRun)
  process.stdout.write(
    `Generated and validated ${count * 3} puzzles deterministically (seed ${seed}).\n`,
  );
else {
  await writeFile(
    new URL("../lib/dna/puzzle-bank.json", import.meta.url),
    output,
  );
  process.stdout.write(
    `Wrote ${count * 3} puzzles to lib/dna/puzzle-bank.json.\n`,
  );
}
