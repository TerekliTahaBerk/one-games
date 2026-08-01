import bank from "../lib/dna/puzzle-bank.json" with { type: "json" };
import { validateRecord } from "./lib/dna-rules.mjs";

const ids = new Set(),
  definitions = new Set(),
  issues = [];
const bands = { easy: [75, 105], medium: [120, 160], hard: [195, 245] };
for (const difficulty of ["easy", "medium", "hard"]) {
  if (!Array.isArray(bank[difficulty]) || bank[difficulty].length < 400)
    issues.push(`${difficulty}: fewer than 400 puzzles`);
  for (const record of bank[difficulty] ?? []) {
    if (ids.has(record.id)) issues.push(`${record.id}: duplicate id`);
    ids.add(record.id);
    const definition = `${record.size}:${record.clues}:${JSON.stringify(record.bonds)}`;
    if (definitions.has(definition))
      issues.push(`${record.id}: duplicate definition`);
    definitions.add(definition);
    if (!record.id.startsWith(`${difficulty}-`))
      issues.push(`${record.id}: wrong difficulty prefix`);
    if (!record.meta?.generator || typeof record.meta.score !== "number")
      issues.push(`${record.id}: missing metadata`);
    else if (
      record.meta.score < bands[difficulty][0] ||
      record.meta.score > bands[difficulty][1]
    )
      issues.push(
        `${record.id}: score ${record.meta.score} is outside the ${difficulty} band`,
      );
    for (const issue of validateRecord(record))
      issues.push(`${record.id}: ${issue}`);
  }
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Validated ${ids.size} OneDna puzzles: unique, rule-valid, uniquely solvable, and logic-only.`,
  );
