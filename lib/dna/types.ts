export type DnaBase = "A" | "T" | "C" | "G";
export type DnaCell = DnaBase | null;
export type DnaBoard = DnaCell[];
export type DnaSize = 4 | 6 | 8;
export type DnaDifficulty = "easy" | "medium" | "hard";
export type DnaPairFamily = "AT" | "CG";

export interface DnaBond {
  id: string;
  a: number;
  b: number;
  kind: "complement";
}

export type DnaTechnique =
  | "naked-single"
  | "neighbour-exclusion"
  | "bond-complement"
  | "pair-saturation"
  | "base-saturation"
  | "pair-completion"
  | "base-completion"
  | "bond-narrowing";

export interface DnaDeduction {
  technique: DnaTechnique;
  targetCells: number[];
  supportingCells: number[];
  supportingBonds: string[];
  eliminatedBases?: DnaBase[];
  placedBase?: DnaBase;
  explanation: string;
  weight: number;
}

export interface DnaDifficultyBreakdown {
  weightedTechniques: number;
  cellsToFill: number;
  longestChain: number;
  tierPenalty: number;
  candidateBreadth: number;
  bondCredit: number;
  score: number;
}

export interface DnaPuzzleMetadata {
  score: number;
  requiredTier: 1 | 2;
  techniques: Partial<Record<DnaTechnique, number>>;
  generator: { seed: number; revision: number };
}

export interface DnaPuzzle {
  id: string;
  difficulty: DnaDifficulty;
  size: DnaSize;
  clues: DnaBoard;
  solution: DnaBase[];
  bonds: DnaBond[];
  metadata: DnaPuzzleMetadata;
}

export type DnaConflictReason =
  | "line-pair-balance"
  | "missing-base"
  | "identical-neighbor"
  | "bond-complement"
  | "incorrect-solution";

export interface DnaConflictRecord {
  reasons: DnaConflictReason[];
  relatedCells: number[];
  bondIds: string[];
}

export type DnaConflictMap = Map<number, DnaConflictRecord>;
export type DnaNotes = Record<number, DnaBase[]>;

export interface DnaSnapshot {
  board: DnaBoard;
  notes: DnaNotes;
}
export const DNA_SAVE_VERSION = 1;

export interface DnaGameSave extends DnaSnapshot {
  version: typeof DNA_SAVE_VERSION;
  puzzleId: string;
  date: string;
  difficulty: DnaDifficulty;
  size: DnaSize;
  elapsed: number;
  started: boolean;
  completed: boolean;
  completedAt?: string;
  mistakes: number;
  hints: number;
  history: DnaSnapshot[];
  future: DnaSnapshot[];
}

export interface DnaSettings {
  checkMistakes: boolean;
  highlightRelated: boolean;
  highlightBonded: boolean;
  sound: boolean;
  reducedMotion: boolean;
}

export interface DnaStats {
  completedDates: string[];
  completedGames: string[];
  gamesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  bestTimes: Partial<Record<DnaDifficulty, number>>;
  completedByDifficulty: Record<DnaDifficulty, number>;
  totalTime: number;
  totalHints: number;
}
