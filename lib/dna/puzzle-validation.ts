import { DNA_BASES, complement, isValidPartialBoard } from "./rules";
import type {
  DnaBase,
  DnaBond,
  DnaDifficulty,
  DnaPuzzle,
  DnaPuzzleMetadata,
  DnaSize,
} from "./types";

const DIFFICULTIES: readonly DnaDifficulty[] = ["easy", "medium", "hard"];
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function base(value: string): value is DnaBase {
  return DNA_BASES.some((item) => item === value);
}
function parseBoard(
  value: unknown,
  size: DnaSize,
  solution = false,
): (DnaBase | null)[] {
  const expression = solution ? /^[ATCG]+$/ : /^[ATCG.]+$/;
  if (
    typeof value !== "string" ||
    value.length !== size * size ||
    !expression.test(value)
  )
    throw new Error("invalid board serialization");
  return [...value].map((cell) =>
    cell === "." ? null : base(cell) ? cell : null,
  );
}
function parseBond(value: unknown, index: number): DnaBond {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value.some((cell) => typeof cell !== "number")
  )
    throw new Error("invalid bond");
  return {
    id: String(index + 1),
    a: value[0],
    b: value[1],
    kind: "complement",
  };
}
function parseMetadata(value: unknown): DnaPuzzleMetadata {
  if (
    !record(value) ||
    typeof value.score !== "number" ||
    (value.requiredTier !== 1 && value.requiredTier !== 2) ||
    !record(value.techniques) ||
    !record(value.generator) ||
    typeof value.generator.seed !== "number" ||
    typeof value.generator.revision !== "number"
  )
    throw new Error("invalid metadata");
  return {
    score: value.score,
    requiredTier: value.requiredTier,
    techniques: value.techniques as DnaPuzzleMetadata["techniques"],
    generator: {
      seed: value.generator.seed,
      revision: value.generator.revision,
    },
  };
}
function parsePuzzle(value: unknown, difficulty: DnaDifficulty): DnaPuzzle {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    (value.size !== 6 && value.size !== 8)
  )
    throw new Error("invalid puzzle record");
  const size = value.size;
  const clues = parseBoard(value.clues, size);
  const solved = parseBoard(value.solution, size, true);
  if (solved.some((cell) => cell === null))
    throw new Error(`${value.id}: incomplete solution`);
  return {
    id: value.id,
    difficulty,
    size,
    clues,
    solution: solved.filter((cell): cell is DnaBase => cell !== null),
    bonds: Array.isArray(value.bonds) ? value.bonds.map(parseBond) : [],
    metadata: parseMetadata(value.meta),
  };
}

export function parsePuzzleBank(
  value: unknown,
): Record<DnaDifficulty, DnaPuzzle[]> {
  if (!record(value)) throw new Error("OneDna bank must be an object");
  const result = Object.fromEntries(
    DIFFICULTIES.map((difficulty) => {
      const entries = value[difficulty];
      if (!Array.isArray(entries) || !entries.length)
        throw new Error(`missing ${difficulty} puzzles`);
      return [
        difficulty,
        entries.map((entry) => parsePuzzle(entry, difficulty)),
      ];
    }),
  );
  return result as Record<DnaDifficulty, DnaPuzzle[]>;
}

export function validatePuzzle(puzzle: DnaPuzzle): string[] {
  const issues: string[] = [],
    owner = new Set<number>(),
    pairs = new Set<string>();
  if (
    puzzle.clues.length !== puzzle.size ** 2 ||
    puzzle.solution.length !== puzzle.size ** 2
  )
    issues.push("board length mismatch");
  for (const bond of puzzle.bonds) {
    const key = [bond.a, bond.b].sort((a, b) => a - b).join(":");
    if (
      bond.a === bond.b ||
      bond.a < 0 ||
      bond.b < 0 ||
      bond.a >= puzzle.size ** 2 ||
      bond.b >= puzzle.size ** 2
    )
      issues.push(`bond ${bond.id} has invalid endpoints`);
    if (owner.has(bond.a) || owner.has(bond.b))
      issues.push(`bond ${bond.id} overlaps another bond`);
    owner.add(bond.a);
    owner.add(bond.b);
    if (pairs.has(key)) issues.push(`bond ${bond.id} is duplicated`);
    pairs.add(key);
    const distance =
      Math.abs(
        Math.floor(bond.a / puzzle.size) - Math.floor(bond.b / puzzle.size),
      ) + Math.abs((bond.a % puzzle.size) - (bond.b % puzzle.size));
    if (distance < 2) issues.push(`bond ${bond.id} is too short`);
    if (puzzle.solution[bond.b] !== complement(puzzle.solution[bond.a]))
      issues.push(`bond ${bond.id} contradicts solution`);
  }
  if (!isValidPartialBoard(puzzle.clues, puzzle))
    issues.push("givens violate rules");
  if (!isValidPartialBoard(puzzle.solution, puzzle))
    issues.push("solution violates rules");
  if (
    puzzle.clues.some((cell, index) => cell && cell !== puzzle.solution[index])
  )
    issues.push("given differs from solution");
  return issues;
}
