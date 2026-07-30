export type Difficulty = "easy" | "medium" | "hard";
export type CellValue = number;
export type Board = CellValue[];
export type Notes = Record<number, number[]>;

export interface Snapshot {
  board: Board;
  notes: Notes;
}

export interface GameSave extends Snapshot {
  version: 1;
  date: string;
  difficulty: Difficulty;
  elapsed: number;
  started: boolean;
  completed: boolean;
  completedAt?: string;
  mistakes: number;
  hints: number;
  history: Snapshot[];
  future: Snapshot[];
}

export interface Settings {
  checkMistakes: boolean;
  highlightRelated: boolean;
  highlightMatching: boolean;
  autoRemoveNotes: boolean;
  autoCandidates: boolean;
  sound: boolean;
  reducedMotion: boolean;
}

export interface Stats {
  completedDates: string[];
  completedGames: string[];
  gamesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  bestTimes: Partial<Record<Difficulty, number>>;
  completedByDifficulty: Record<Difficulty, number>;
  totalTime: number;
  totalHints: number;
}
