import { weightedTechniqueScore } from "./logical-solver";
import type {
  DnaDeduction,
  DnaDifficulty,
  DnaDifficultyBreakdown,
} from "./types";

export const DNA_SCORE_BANDS: Record<DnaDifficulty, readonly [number, number]> =
  {
    easy: [75, 105],
    medium: [120, 160],
    hard: [195, 245],
  };

export function scoreDifficulty(
  difficulty: DnaDifficulty,
  cellsToFill: number,
  bondCount: number,
  deductions: readonly DnaDeduction[],
): DnaDifficultyBreakdown {
  const weightedTechniques = weightedTechniqueScore(deductions);
  const tierPenalty = difficulty === "easy" ? 0 : 15;
  const candidateBreadth =
    difficulty === "hard" ? 24 : difficulty === "medium" ? 12 : 4;
  const bondCredit = -1.5 * bondCount;
  const raw =
    weightedTechniques +
    cellsToFill * 0.6 +
    tierPenalty +
    candidateBreadth +
    bondCredit;
  const [minimum, maximum] = DNA_SCORE_BANDS[difficulty];
  const score = Math.max(minimum, Math.min(maximum, Math.round(raw)));
  return {
    weightedTechniques,
    cellsToFill,
    longestChain: deductions.length,
    tierPenalty,
    candidateBreadth,
    bondCredit,
    score,
  };
}
