export type LetterState = "correct" | "present" | "absent";

export interface EvaluatedLetter {
  letter: string;
  state: LetterState;
}
export type WordStatus = "playing" | "won" | "lost";
export interface WordPuzzle {
  id: string;
  date: string;
  answer: string;
  number: number;
}

export const WORD_SAVE_VERSION = 1;
export interface WordGameSave {
  version: typeof WORD_SAVE_VERSION;
  puzzleId: string;
  date: string;
  guesses: string[];
  currentGuess: string;
  status: WordStatus;
  elapsed: number;
  startedAt?: string;
  completedAt?: string;
}
export interface WordSettings {
  reducedMotion: boolean;
  highContrast: boolean;
}
export interface WordStats {
  version: 1;
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  distribution: [number, number, number, number, number, number];
  completedPuzzleIds: string[];
  lastDailyWin?: string;
  totalAttempts: number;
  totalTime: number;
}
